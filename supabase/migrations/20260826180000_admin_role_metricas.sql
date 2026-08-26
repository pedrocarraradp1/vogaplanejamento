-- Role admin + métricas agregadas (security definer).
-- Plano no schema real = public.simulacoes (não existe tabela `planos`).
-- profiles não tem coluna `nome`; o nome do assessor vem de auth.users.

-- 1) CHECK de role: aceitar 'admin' além de advisor/cliente
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('advisor', 'cliente', 'admin'));

-- 2) Helper: o uid atual é admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3) Leitura extra para admin (além das políticas por assessor, se existirem)
drop policy if exists "clientes_admin_select" on public.clientes;
create policy "clientes_admin_select"
on public.clientes
for select
using (public.is_admin());

drop policy if exists "simulacoes_admin_select" on public.simulacoes;
create policy "simulacoes_admin_select"
on public.simulacoes
for select
using (public.is_admin());

-- 4) RPC: agregação de planejamentos. Só executa se is_admin().
-- TODO: sem status de conclusão no schema — tratando criação como conclusão
create or replace function public.admin_metricas_planejamentos(
  p_inicio timestamptz,
  p_fim timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamptz := p_inicio;
  v_fim timestamptz := p_fim;
  v_dias numeric;
  v_weekly boolean;
  v_planos_periodo integer;
  v_planos_total integer;
  v_assessores_ativos integer;
  v_serie jsonb;
  v_assessores jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not authorized'
      using errcode = '42501';
  end if;

  if v_inicio is null or v_fim is null or v_inicio > v_fim then
    raise exception 'intervalo inválido'
      using errcode = '22023';
  end if;

  v_dias := extract(epoch from (v_fim - v_inicio)) / 86400.0;
  v_weekly := v_dias > 45;

  select count(*)::int into v_planos_total from public.simulacoes;

  select count(*)::int into v_planos_periodo
  from public.simulacoes s
  where s.created_at >= v_inicio
    and s.created_at <= v_fim;

  select count(distinct x.advisor_id)::int into v_assessores_ativos
  from (
    select coalesce(s.advisor_id, c.advisor_id) as advisor_id
    from public.simulacoes s
    left join public.clientes c on c.id = s.cliente_id
    where coalesce(s.advisor_id, c.advisor_id) is not null
      and (
        (s.created_at >= v_inicio and s.created_at <= v_fim)
        or (s.updated_at >= v_inicio and s.updated_at <= v_fim)
      )
  ) x
  inner join public.profiles p on p.id = x.advisor_id and p.role = 'advisor';

  if v_weekly then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'periodo', to_char(b.bucket, 'YYYY-MM-DD'),
        'quantidade', b.quantidade
      )
      order by b.bucket
    ), '[]'::jsonb)
    into v_serie
    from (
      select
        gs::date as bucket,
        count(s.id)::int as quantidade
      from generate_series(
        date_trunc('week', v_inicio at time zone 'America/Sao_Paulo')::date,
        (v_fim at time zone 'America/Sao_Paulo')::date,
        interval '7 days'
      ) gs
      left join public.simulacoes s
        on date_trunc('week', s.created_at at time zone 'America/Sao_Paulo')::date = gs::date
       and s.created_at >= v_inicio
       and s.created_at <= v_fim
      group by gs::date
    ) b;
  else
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'periodo', to_char(b.bucket, 'YYYY-MM-DD'),
        'quantidade', b.quantidade
      )
      order by b.bucket
    ), '[]'::jsonb)
    into v_serie
    from (
      select
        gs::date as bucket,
        count(s.id)::int as quantidade
      from generate_series(
        (v_inicio at time zone 'America/Sao_Paulo')::date,
        (v_fim at time zone 'America/Sao_Paulo')::date,
        interval '1 day'
      ) gs
      left join public.simulacoes s
        on (s.created_at at time zone 'America/Sao_Paulo')::date = gs::date
       and s.created_at >= v_inicio
       and s.created_at <= v_fim
      group by gs::date
    ) b;
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.planos_no_periodo desc, t.advisor_nome), '[]'::jsonb)
  into v_assessores
  from (
    select
      p.id as advisor_id,
      coalesce(
        nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(u.raw_user_meta_data->>'name'), ''),
        u.email,
        'Assessor'
      ) as advisor_nome,
      count(s.id) filter (
        where s.created_at >= v_inicio and s.created_at <= v_fim
      )::int as planos_no_periodo,
      count(s.id)::int as planos_total,
      max(greatest(s.created_at, s.updated_at)) as ultima_atividade
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join (
      select
        coalesce(sim.advisor_id, cli.advisor_id) as advisor_id,
        sim.id,
        sim.created_at,
        sim.updated_at
      from public.simulacoes sim
      left join public.clientes cli on cli.id = sim.cliente_id
      where coalesce(sim.advisor_id, cli.advisor_id) is not null
    ) s on s.advisor_id = p.id
    where p.role = 'advisor'
    group by p.id, u.raw_user_meta_data, u.email
  ) t;

  return jsonb_build_object(
    'planos_periodo', v_planos_periodo,
    'planos_total', v_planos_total,
    -- TODO: sem status de conclusão no schema — tratando criação como conclusão
    'planos_realizados', v_planos_periodo,
    'assessores_ativos', v_assessores_ativos,
    'granularidade', case when v_weekly then 'semana' else 'dia' end,
    'serie', coalesce(v_serie, '[]'::jsonb),
    'assessores', coalesce(v_assessores, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_metricas_planejamentos(timestamptz, timestamptz) from public;
grant execute on function public.admin_metricas_planejamentos(timestamptz, timestamptz) to authenticated;

-- Promover um usuário (depois desta migration):
-- update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
