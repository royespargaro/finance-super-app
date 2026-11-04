import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// PRIVILEGED client — bypasses Row Level Security entirely via the
// service-role key. Never import this outside trusted server code (sync
// engine, Gmail token storage/refresh, admin scripts). Never expose
// SUPABASE_SERVICE_ROLE_KEY to the browser, and the "server-only" import
// above makes accidentally bundling this file into client code a build
// error rather than a silent leak.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
