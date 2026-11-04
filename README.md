# finance-super-app

Personal finance aggregation app. Pulls transaction data from Gmail
notifications (and later official APIs / CSV), normalizes it, and shows one
dashboard for balances, spending, and net worth.

## Status

Phase 1: project scaffold only. No database, auth, or Gmail integration yet.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres) · Google
OAuth + Gmail API · Gemini (used sparingly) · Vercel.

## Local dev

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` once later phases introduce real
environment variables.
