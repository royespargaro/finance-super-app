import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// This page reads the session on every request (who's logged in, sign-out
// button, Gmail connection status), so there's nothing useful to prerender
// into a static shell. Revisit with Suspense-streamed auth (see Next's
// authentication-with-cache-components guide) once there's static content
// above the fold worth shipping instantly.
export const instant = false;

const GMAIL_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "That connection attempt looked tampered with — try again.",
  no_refresh_token:
    "Google didn't return a refresh token. Try disconnecting Gmail access in your Google Account settings, then connect again.",
  storage_failed: "Connected to Google, but saving the connection failed. Try again.",
  exchange_failed: "The connection to Google failed partway through. Try again.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ gmail_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // gmail_connections has no RLS policies for the authenticated role (by
  // design — only the service role can touch it), so checking connection
  // status has to go through the admin client, server-side only. We only
  // ever read the email/timestamp here, never the tokens, and nothing from
  // this table reaches the client beyond those two fields.
  const admin = createAdminClient();
  const { data: gmailConnection } = await admin
    .from("gmail_connections")
    .select("email, connected_at, last_sync_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { gmail_error } = await searchParams;
  const errorMessage = gmail_error ? GMAIL_ERROR_MESSAGES[gmail_error] : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Finance Super App
      </h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.email}. Dashboard and sync come in later phases.
      </p>

      {errorMessage && (
        <p className="max-w-sm rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      {gmailConnection ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Gmail connected: <strong>{gmailConnection.email}</strong>
          </p>
          <a
            href="/api/gmail/connect"
            className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Reconnect
          </a>
        </div>
      ) : (
        <a
          href="/api/gmail/connect"
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Connect Gmail
        </a>
      )}

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/5 dark:border-white/15 dark:text-zinc-50 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
