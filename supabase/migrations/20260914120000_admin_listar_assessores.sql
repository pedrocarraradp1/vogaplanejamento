-- Lista assessores (e admins) para o filtro da tela /clientes.
-- Só executa se public.is_admin(). O nome vem de auth.users (profiles não tem coluna nome).
-- Rode no SQL Editor do Supabase ou via CLI: supabase db push

create or replace function public.admin_listar_assessores()
returns table (
  advisor_id uuid,
  nome text,
  email text,
  total_clientes integer,
  total_simulacoes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not authorized'
      using errcode = '42501';
  end if;

  return query
  select
    p.id as advisor_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      u.email,
      'Assessor'
    ) as nome,
    u.email,
    coalesce(stats.total_clientes, 0)::int as total_clientes,
    coalesce(stats.total_simulacoes, 0)::int as total_simulacoes
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join (
    select
      coalesce(sim.advisor_id, cli.advisor_id) as advisor_id,
      count(*)::int as total_simulacoes,
      count(
        distinct coalesce(
          sim.cliente_id::text,
          lower(sim.dados->'dadosPessoais'->>'nome')
        )
      )::int as total_clientes
    from public.simulacoes sim
    left join public.clientes cli on cli.id = sim.cliente_id
    where coalesce(sim.advisor_id, cli.advisor_id) is not null
    group by 1
  ) stats on stats.advisor_id = p.id
  where p.role in ('advisor', 'admin')
  order by 2;
end;
$$;

revoke all on function public.admin_listar_assessores() from public;
grant execute on function public.admin_listar_assessores() to authenticated;
