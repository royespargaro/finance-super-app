import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// This page reads the session on every request (who's logged in, sign-out
// button), so there's nothing useful to prerender into a static shell.
// Revisit with Suspense-streamed auth (see Next's
// authentication-with-cache-components guide) once there's static content
// above the fold worth shipping instantly.
export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Finance Super App
      </h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.email}. Gmail connection, dashboard, and sync come
        in later phases.
      </p>
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
