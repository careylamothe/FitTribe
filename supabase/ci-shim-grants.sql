-- CI-only shim, part 2: run AFTER supabase/schema.sql.
-- Do NOT run this against a real Supabase project - Supabase already
-- grants its `anon`/`authenticated` roles the right table privileges as
-- part of the platform itself. `GRANT ... ON ALL TABLES IN SCHEMA public`
-- only applies to tables that exist at the moment it runs, which is why
-- this has to come after schema.sql creates them, not before.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
