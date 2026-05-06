-- advisor_id para RLS por assessor (auth.users)
alter table public.clientes add column if not exists advisor_id uuid references auth.users (id) on delete set null;
alter table public.simulacoes add column if not exists advisor_id uuid references auth.users (id) on delete set null;

create index if not exists clientes_advisor_id_idx on public.clientes (advisor_id);
create index if not exists simulacoes_advisor_id_idx on public.simulacoes (advisor_id);
