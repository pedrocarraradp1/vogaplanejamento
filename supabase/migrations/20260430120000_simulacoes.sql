-- Clientes + Simulações (advisor)
-- Cria estrutura para múltiplas simulações por cliente.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- clientes
-- Observação: este projeto já usa uma tabela `public.clientes` em algumas rotas.
-- Esta migration é compatível: cria se não existir e/ou adiciona colunas faltantes.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text,
  profissao text,
  dados jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clientes add column if not exists nome text;
alter table public.clientes add column if not exists profissao text;
alter table public.clientes add column if not exists dados jsonb;
alter table public.clientes add column if not exists created_at timestamptz default now();
alter table public.clientes add column if not exists updated_at timestamptz default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- simulacoes
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.simulacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  nome_simulacao text,
  dados jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists simulacoes_cliente_id_idx on public.simulacoes (cliente_id);
create index if not exists simulacoes_created_at_idx on public.simulacoes (created_at desc);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_clientes on public.clientes;
create trigger set_updated_at_clientes
before update on public.clientes
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_simulacoes on public.simulacoes;
create trigger set_updated_at_simulacoes
before update on public.simulacoes
for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (políticas simples para funcionar com login)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.clientes enable row level security;
alter table public.simulacoes enable row level security;

-- Permite uso para usuários autenticados (ajustar depois para restringir por advisor_id, se desejar)
drop policy if exists "clientes_authenticated_all" on public.clientes;
create policy "clientes_authenticated_all"
on public.clientes
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "simulacoes_authenticated_all" on public.simulacoes;
create policy "simulacoes_authenticated_all"
on public.simulacoes
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

