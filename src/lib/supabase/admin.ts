import { createClient } from "@supabase/supabase-js";

// IMPORTANT: this client uses the service role key, which bypasses Row
// Level Security entirely. It must never be imported into any file that
// can run in the browser. Only use it from server components, server
// actions, route handlers, or the NextAuth config.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
