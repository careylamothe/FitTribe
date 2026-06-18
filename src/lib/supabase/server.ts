import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * NextAuth (not Supabase Auth) owns the session in this app, so there's no
 * Supabase-issued JWT to attach to requests. That means server-side reads
 * go through the service-role client, which bypasses RLS - so every query
 * in route handlers / server components MUST explicitly scope by the
 * current session's user id (e.g. `.eq("user_id", session.user.id)`).
 *
 * The RLS policies in supabase/schema.sql still matter: they're the
 * enforcement layer for anything queried directly with the anon key
 * (e.g. a future client-side Realtime subscription), and they're what
 * the CI workflow tests against a Postgres service container.
 */
export function getServerSupabaseClient() {
  return supabaseAdmin;
}
