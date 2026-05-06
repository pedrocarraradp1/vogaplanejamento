-- Adiciona nome do cenário (múltiplos cenários por cliente)
alter table public.simulacoes
add column if not exists nome_cenario text default 'Cenário Principal';

