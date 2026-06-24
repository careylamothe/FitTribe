-- FitTribe Supabase schema
-- Run this in the Supabase SQL editor for your project.
-- Do NOT run supabase/ci-shim.sql against this database - that file
-- emulates Supabase's auth schema for testing against a vanilla Postgres
-- container in CI, and Supabase already provides the real implementation.

create extension if not exists "uuid-ossp";

-- ---------- Auth.js / NextAuth adapter tables ----------
-- Shape required by @auth/supabase-adapter. We extend `users` with a
-- couple of app-specific columns (password_hash, role) alongside the
-- columns the adapter expects.

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  password_hash text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, "providerAccountId")
);

create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  "userId" uuid not null references public.users(id) on delete cascade,
  expires timestamptz not null,
  "sessionToken" text not null unique
);

create table if not exists public.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

-- ---------- App tables ----------

create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_user_id on public.calendar_events(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

-- ---------- Row Level Security ----------
-- The app's own server-side queries currently go through the Supabase
-- service-role key (see src/lib/supabase/server.ts), which bypasses RLS -
-- so these policies aren't yet the primary access control for the Next.js
-- app itself. They matter for two reasons: they're the enforcement layer
-- for anything queried with the anon key (a future client-side Realtime
-- subscription, for example), and they're what the CI workflow exercises
-- against a Postgres service container before every merge.

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.calendar_events enable row level security;
alter table public.chat_messages enable row level security;

-- accounts: only the owning user can see their own OAuth account links
-- (server-side adapter uses service role and bypasses RLS)
create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = "userId");

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = "userId");

-- sessions: only the owning user can see their own session
create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = "userId");

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = "userId");

-- verification_tokens: no direct client access needed; service role handles all reads/writes
create policy "No direct client access to verification tokens"
  on public.verification_tokens for select
  using (false);

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Authenticated users can view all calendar events"
  on public.calendar_events for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert calendar events"
  on public.calendar_events for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update calendar events"
  on public.calendar_events for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete calendar events"
  on public.calendar_events for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Authenticated members can read chat"
  on public.chat_messages for select
  using (auth.role() = 'authenticated');

create policy "Users can post chat as themselves"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);
