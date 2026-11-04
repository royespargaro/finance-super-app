-- Phase 2: database foundation.
-- Auth: Supabase Auth (auth.users). Gmail OAuth is a separate connection,
-- stored in gmail_connections, never used for app login.
--
-- Balance model: an account's balance can come from three places, and the
-- dashboard must always say which one it's showing. See financial_accounts
-- below for balance_source / confirmed_balance / balance_source_reference.

-- ---------------------------------------------------------------------------
-- institutions: one row per bank/wallet/platform (BCA, BNI, GoPay, ...)
-- ---------------------------------------------------------------------------
create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text,
  logo_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- financial_accounts: a BCA checking account, a GoPay wallet, etc.
--
-- balance_source:
--   'api_verified'   — pulled live from an official API, always wins
--   'email_reported' — a balance figure that appeared in a transaction email
--   'calculated'     — confirmed_balance + sum of transactions since
-- balance_source_reference: human-readable provenance, e.g.
--   "Gmail message 18c2f...", "BCA API sync 2026-11-04", "manual entry"
-- ---------------------------------------------------------------------------
create table financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id),
  name text not null,
  account_type text not null check (
    account_type in ('bank', 'wallet', 'credit_card', 'cash', 'investment', 'brokerage', 'crypto', 'other')
  ),
  currency text not null default 'IDR',

  balance_source text not null default 'calculated' check (
    balance_source in ('api_verified', 'email_reported', 'calculated')
  ),
  confirmed_balance numeric(18, 2) not null default 0,
  confirmed_balance_at timestamptz,
  balance_source_reference text,

  data_source text not null check (data_source in ('gmail', 'api', 'csv', 'manual')),
  external_account_id text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_accounts_user_id_idx on financial_accounts(user_id);

-- ---------------------------------------------------------------------------
-- gmail_connections: the Gmail OAuth grant. Completely separate from app
-- login. RLS is enabled with NO policies below — meaning the anon and
-- authenticated roles get zero access, full stop. Only the service-role key
-- (server-side only, never shipped to the browser) can read or write this
-- table, since the service role bypasses RLS by design.
-- ---------------------------------------------------------------------------
create table gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  scope text not null,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz
);

create index gmail_connections_user_id_idx on gmail_connections(user_id);

-- ---------------------------------------------------------------------------
-- institution_configs: how to recognize an institution's emails in Gmail
-- ---------------------------------------------------------------------------
create table institution_configs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id),
  sender_addresses text[] not null default '{}',
  sender_domains text[] not null default '{}',
  subject_patterns text[] not null default '{}',
  gmail_labels text[] not null default '{}',
  parser_name text not null,
  parser_version text not null default '1.0',
  enabled boolean not null default true
);

-- ---------------------------------------------------------------------------
-- transactions: the normalized record, regardless of source.
-- Duplicate protection: the unique constraint on (user_id, source_type,
-- source_message_id) means re-syncing the same Gmail message can never
-- create a second row — "Sync Now" five times in a row is safe.
-- ---------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references financial_accounts(id) on delete cascade,
  institution_id uuid not null references institutions(id),

  transaction_type text not null check (
    transaction_type in (
      'income', 'expense', 'transfer', 'refund', 'fee',
      'interest', 'investment_buy', 'investment_sell', 'dividend', 'tax', 'unknown'
    )
  ),
  amount numeric(18, 2) not null,
  currency text not null,
  merchant text,
  recipient text,
  description text,
  transaction_date date not null,
  transaction_time time,
  category text,
  subcategory text,

  -- transfers: two rows (debit + credit) share a transfer_group_id so the
  -- financial engine can net them out of income/expense totals while still
  -- applying each to its own account balance.
  transfer_group_id uuid,

  source_type text not null check (source_type in ('gmail', 'api', 'csv', 'manual')),
  source_message_id text,
  source_external_id text,
  source_subject text,
  parser_name text,
  parser_version text,
  status text not null default 'processed' check (status in ('processed', 'needs_review', 'corrected')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, source_type, source_message_id)
);

create index transactions_user_id_idx on transactions(user_id);
create index transactions_account_id_idx on transactions(account_id);
create index transactions_transaction_date_idx on transactions(transaction_date);
create index transactions_transfer_group_id_idx on transactions(transfer_group_id);

-- ---------------------------------------------------------------------------
-- needs_review: emails that look financial but couldn't be parsed
-- ---------------------------------------------------------------------------
create table needs_review (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_source_ref text,
  institution_guess text,
  detected_amount numeric(18, 2),
  email_subject text,
  parser_error text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index needs_review_user_id_idx on needs_review(user_id);

-- ---------------------------------------------------------------------------
-- sync_runs: history/telemetry for each "Sync Now"
-- ---------------------------------------------------------------------------
create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  messages_discovered int not null default 0,
  messages_processed int not null default 0,
  messages_parsed int not null default 0,
  duplicates int not null default 0,
  errors int not null default 0,
  transactions_created int not null default 0,
  transactions_updated int not null default 0
);

create index sync_runs_user_id_idx on sync_runs(user_id);

-- ---------------------------------------------------------------------------
-- investments / assets / liabilities (architecture now, populated later)
-- ---------------------------------------------------------------------------
create table investment_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references financial_accounts(id) on delete cascade,
  symbol text not null,
  asset_class text not null check (asset_class in ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'gold', 'other')),
  quantity numeric(24, 8) not null default 0,
  avg_cost numeric(18, 2),
  current_value numeric(18, 2),
  unrealized_pl numeric(18, 2),
  updated_at timestamptz not null default now()
);

create index investment_holdings_user_id_idx on investment_holdings(user_id);

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null,
  value numeric(18, 2) not null,
  updated_at timestamptz not null default now()
);

create index assets_user_id_idx on assets(user_id);

create table liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  liability_type text not null,
  balance numeric(18, 2) not null,
  updated_at timestamptz not null default now()
);

create index liabilities_user_id_idx on liabilities(user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- institutions / institution_configs: reference data, readable by any
-- logged-in user, writable by no one via the API (we manage these ourselves
-- via the SQL editor or service role).
alter table institutions enable row level security;
create policy "institutions are readable by authenticated users"
  on institutions for select
  to authenticated
  using (true);

alter table institution_configs enable row level security;
create policy "institution_configs are readable by authenticated users"
  on institution_configs for select
  to authenticated
  using (true);

-- Per-user tables: standard "only your own rows" policy, for every operation.
do $$
declare
  t text;
begin
  foreach t in array array[
    'financial_accounts', 'transactions', 'needs_review', 'sync_runs',
    'investment_holdings', 'assets', 'liabilities'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "users manage their own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- gmail_connections: RLS enabled, deliberately NO policies for
-- anon/authenticated. Only the service-role key (server-side only) can
-- touch this table.
alter table gmail_connections enable row level security;
