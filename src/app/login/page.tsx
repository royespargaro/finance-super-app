"use client";

import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Finance Super App
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see your dashboard. This only identifies you — Gmail
          access is a separate step once you&apos;re in.
        </p>
      </div>
      <button
        onClick={handleSignIn}
        className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Sign in with Google
      </button>
    </div>
  );
}
