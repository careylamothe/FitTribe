# FitTribe

A fitness community member portal: authenticated dashboard, a personal class
calendar, and a tribe chat feed.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** NextAuth.js v5 — Google, GitHub, and email/password (Credentials) providers
- **Database:** Supabase (Postgres + Row Level Security)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (git-integrated build/preview/deploy — no custom CD workflow needed)

## Why this stack, and what it deliberately doesn't do

Vercel + Supabase is serverless by design: Vercel deploys straight from git
with zero custom CI/CD required, and Supabase has no containers to build or
orchestrate. That's a deliberate trade — it ships a real app fast, but it
means there's no Docker-for-deployment story here, and no GitHub Container
Registry push. The one piece of custom CI that *does* exist (below) is
narrow and specific: testing Row Level Security policies against a real,
disposable Postgres instance before any PR can merge.

## Environment variables

```
NEXTAUTH_SECRET=            # openssl rand -base64 32
NEXTAUTH_URL=                # http://localhost:3000 in dev
AUTH_SECRET=                # openssl rand -base64 32 

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_ID=
GITHUB_SECRET=

NEXT_PUBLIC_SUPABASE_URL=        # safe for the browser
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # safe for the browser
SUPABASE_SERVICE_ROLE_KEY=        # SERVER ONLY - bypasses RLS entirely, never expose this
```

The distinction between the last two matters: the anon key respects Row
Level Security and is fine to ship to the browser; the service role key
bypasses RLS completely and must never leave the server. `src/lib/supabase/admin.ts`
is the only place it's used, and that file is explicitly commented as
server-only.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in the values above
# paste supabase/schema.sql into your Supabase project's SQL editor
npm run dev
```

## Architecture notes

NextAuth (not Supabase Auth) owns the session, so there's no Supabase-issued
JWT to attach to client requests. That means the app's own server-side reads
and writes (in `src/app/dashboard/**`) go through the service-role client,
which bypasses RLS — every query is manually scoped to the signed-in user's
id in application code rather than relying on the database to enforce it.

So why keep the RLS policies in `supabase/schema.sql` at all? Two reasons:
they're the real enforcement layer for anything queried with the anon key in
the future (a client-side Realtime subscription, for example), and they're
exactly what the CI pipeline below tests against a disposable database
before every merge — a meaningful, recent, hands-on GitHub Actions story
that doesn't require touching the app's deployment model at all.

## CI: testing RLS against a Postgres service container

`.github/workflows/ci.yml` runs on every pull request:

1. Spins up Postgres as a GitHub Actions **service container** — disposable,
   identical every run, destroyed when the job finishes. Separate from the
   real Supabase project; tests never touch production data.
2. Installs dependencies, lints, and type-checks.
3. Applies `supabase/ci-shim.sql`, which emulates just enough of Supabase's
   `auth` schema (`auth.uid()`, `auth.role()`, the `anon`/`authenticated`
   roles) for the RLS policies to actually be testable against a vanilla
   Postgres image. This file is CI-only and never touches the real Supabase
   project, which already provides the real implementation.
4. Applies `supabase/schema.sql` — the same schema and RLS policies that get
   pasted into the real Supabase SQL editor.
5. Applies `supabase/ci-shim-grants.sql`, which grants the `anon`/
   `authenticated` roles table privileges now that the tables actually
   exist (`GRANT ... ON ALL TABLES` only applies to tables that exist at
   the moment it runs, which is why this is a separate, later step rather
   than part of `ci-shim.sql`). Supabase already handles this grant itself
   in production, so this file is CI-only too.
6. Runs `tests/rls.test.ts` (Vitest + `pg`), which opens transactions as
   different simulated users (`SET LOCAL ROLE authenticated; SET LOCAL
   request.jwt.claim.sub = '<uuid>'`) and asserts the policies actually do
   what they claim: a user can only see their own calendar events, an
   anonymous session is blocked from chat entirely, and nobody can insert a
   row on someone else's behalf.

Wire this workflow as a required status check so PRs can't merge without
passing.

## Interview narrative (STAR)

- **Situation:** no hands-on GitHub Actions experience beyond coursework.
- **Task:** build real, defensible CI for a stack that's otherwise
  serverless and doesn't need a custom pipeline to deploy.
- **Action:** designed a workflow using a Postgres service container plus a
  small auth shim, so the database's actual Row Level Security policies —
  not mocks — get exercised on every PR.
- **Result:** every PR is tested against a real, disposable database
  enforcing the same access-control rules as production, before it can
  merge.

## Project layout

```
src/
  auth.ts                  NextAuth v5 config (Google, GitHub, Credentials)
  middleware.ts              Two-tier route protection: /dashboard, /admin
  app/
    login/page.tsx            Server component + server action for credentials
    dashboard/
      layout.tsx                Server-side auth double-check + nav
      page.tsx
      calendar/page.tsx          Create + list events (Day 5 feature)
      chat/page.tsx               Post + list messages (no realtime yet)
    api/auth/[...nextauth]/route.ts
  components/ui/OAuthButtons.tsx  Client component for Google/GitHub sign-in
  lib/supabase/
    admin.ts                   Service-role client - server-only
    server.ts                   Thin wrapper, documents the manual-scoping requirement
  types/                        NextAuth type extensions + table types
supabase/
  schema.sql                   Production schema + RLS - paste into Supabase
  ci-shim.sql                   CI-only auth.uid()/auth.role() emulation
tests/rls.test.ts               RLS policy tests against a real Postgres instance
.github/workflows/ci.yml        PR gate: lint + typecheck + RLS tests
```

## Not yet built

- Realtime chat (currently a plain request/response cycle)
- Password reset / email verification
- Terraform for provisioning anything — not needed here since Vercel and
  Supabase both manage their own infrastructure
