import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server-side Supabase client, scoped to the current logged-in user via
// their session cookie. Still goes through RLS — this is NOT a privileged
// client. Use this in Server Components, route handlers, and server
// actions wherever you'd otherwise use the browser client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll can be called from a Server Component where cookies
            // can't be written; middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
