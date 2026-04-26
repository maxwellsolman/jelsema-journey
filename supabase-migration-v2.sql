-- ============================================================
-- Jelsema Journey — Migration v2
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- SETTINGS (app-wide key/value store — used for Kid of the Month)
-- ============================================================
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.settings enable row level security;

create policy "settings_admin_all"    on public.settings for all    using (is_admin());
create policy "settings_public_read"  on public.settings for select using (true);

-- ============================================================
-- WALLET TRANSACTIONS (kids log their own spending)
-- ============================================================
create table if not exists public.wallet_transactions (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references public.kids(id) on delete cascade not null,
  amount      decimal(10,2) not null check (amount > 0),
  description text,
  date        date not null default current_date,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.wallet_transactions enable row level security;

create policy "wallet_admin_all"    on public.wallet_transactions for all    using (is_admin());
create policy "wallet_own_select"   on public.wallet_transactions for select using (kid_id = my_kid_id());
create policy "wallet_own_insert"   on public.wallet_transactions for insert with check (kid_id = my_kid_id());
create policy "wallet_own_delete"   on public.wallet_transactions for delete using (kid_id = my_kid_id());
