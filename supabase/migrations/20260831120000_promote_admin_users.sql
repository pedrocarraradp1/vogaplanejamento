-- Promove usuários específicos a admin (aba /admin e métricas agregadas).
-- Requer: migration 20260826180000_admin_role_metricas.sql (role 'admin' na CHECK).

insert into public.profiles (id, role, updated_at)
select u.id, 'admin', now()
from auth.users u
where lower(trim(u.email)) in (
  'pedro.andrade@grupovoga.com',
  'danielcdanzig@gmail.com'
)
on conflict (id) do update
  set role = 'admin',
      updated_at = excluded.updated_at;
