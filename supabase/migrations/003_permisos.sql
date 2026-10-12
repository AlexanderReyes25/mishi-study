-- Permisos de acceso a las tablas para usuarios con sesión.
-- La seguridad por fila (RLS) sigue limitando cada tabla a los datos propios.
-- Ya está ejecutado en el proyecto de Supabase: es solo registro. No se vuelve a ejecutar.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
