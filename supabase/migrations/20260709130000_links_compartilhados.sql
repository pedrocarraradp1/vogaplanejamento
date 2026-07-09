-- Links de compartilhamento somente leitura (referência ao cenário, sem snapshot)
create table if not exists public.links_compartilhados (
  id uuid primary key default gen_random_uuid(),
  token varchar(32) unique not null,
  simulacao_id uuid not null references public.simulacoes (id) on delete cascade,
  criado_por uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz default now() not null,
  revogado_em timestamptz null
);

create index if not exists links_compartilhados_simulacao_id_idx
  on public.links_compartilhados (simulacao_id);

create index if not exists links_compartilhados_token_ativo_idx
  on public.links_compartilhados (token)
  where revogado_em is null;

alter table public.links_compartilhados enable row level security;

drop policy if exists "links_compartilhados_advisor_select" on public.links_compartilhados;
create policy "links_compartilhados_advisor_select"
on public.links_compartilhados
for select
using (
  criado_por = auth.uid()
  or exists (
    select 1
    from public.simulacoes s
    where s.id = simulacao_id
      and s.advisor_id = auth.uid()
  )
);

drop policy if exists "links_compartilhados_advisor_insert" on public.links_compartilhados;
create policy "links_compartilhados_advisor_insert"
on public.links_compartilhados
for insert
with check (
  criado_por = auth.uid()
  and exists (
    select 1
    from public.simulacoes s
    where s.id = simulacao_id
      and (s.advisor_id = auth.uid() or s.advisor_id is null)
  )
);

drop policy if exists "links_compartilhados_advisor_update" on public.links_compartilhados;
create policy "links_compartilhados_advisor_update"
on public.links_compartilhados
for update
using (
  criado_por = auth.uid()
  or exists (
    select 1
    from public.simulacoes s
    where s.id = simulacao_id
      and s.advisor_id = auth.uid()
  )
)
with check (
  criado_por = auth.uid()
  or exists (
    select 1
    from public.simulacoes s
    where s.id = simulacao_id
      and s.advisor_id = auth.uid()
  )
);
