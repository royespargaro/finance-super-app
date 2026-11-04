export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Finance Super App
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Phase 1 scaffold is live. Dashboard, accounts, and sync will land in
          later phases.
        </p>
      </main>
    </div>
  );
}
