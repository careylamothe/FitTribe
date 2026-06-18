-- CI-only shim, part 1: run BEFORE supabase/schema.sql.
-- Do NOT run this against a real Supabase project.
--
-- Supabase's hosted Postgres ships with an `auth` schema providing
-- auth.uid() / auth.role(), backed by PostgREST reading the request's
-- JWT. A vanilla `postgres:16-alpine` service container in GitHub Actions
-- has neither, so this file recreates just enough of that surface for
-- the RLS policies in schema.sql to be testable:
--   - auth.uid()  reads the 'sub' claim from a per-session GUC
--   - auth.role() reads the 'role' claim, defaulting to 'anon'
--   - anon / authenticated roles, matching Supabase's own role names
--
-- Tests simulate a signed-in user with, inside a transaction:
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claim.sub  = '<user-uuid>';
--   SET LOCAL request.jwt.claim.role = 'authenticated';

create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), 'anon')
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
