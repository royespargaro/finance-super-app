import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client: uses the anon key only, safe to ship to the
// browser. RLS means this client can only ever see the logged-in user's own
// rows (and gmail_connections is invisible to it entirely).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
