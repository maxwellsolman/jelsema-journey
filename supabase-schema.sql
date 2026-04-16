-- ============================================================
-- Jelsema Journey — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ADMINS
-- ============================================================
create table public.admins (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- KIDS
-- ============================================================
create table public.kids (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete set null,
  initials            text not null,
  display_name        text,
  intake_date         date,
  orientation_end_at  timestamptz,
  is_active           boolean default true,
  created_at          timestamptz default now()
);

-- ============================================================
-- DAILY LOGS
-- ============================================================
create table public.daily_logs (
  id                     uuid primary key default uuid_generate_v4(),
  kid_id                 uuid references public.kids(id) on delete cascade not null,
  date                   date not null,

  -- AM shift behaviors (6am-2pm)
  am_follow_rules          boolean default false,
  am_got_up_on_time        boolean default false,
  am_left_on_time          boolean default false,
  am_returned_hygiene      boolean default false,
  am_no_contraband         boolean default false,
  am_respectful            boolean default false,
  am_make_bed              boolean default false,
  am_appropriately_dressed boolean default false,

  -- PM shift behaviors (2pm-10pm)
  pm_follow_rules          boolean default false,
  pm_group_participation   boolean default false,
  pm_no_contraband         boolean default false,
  pm_returned_hygiene      boolean default false,
  pm_tech_use              boolean default false,
  pm_helped_clean          boolean default false,
  pm_appropriately_dressed boolean default false,
  pm_hall_behavior         boolean default false,
  pm_no_horseplay          boolean default false,
  pm_respectful            boolean default false,

  -- Overnight behaviors (10pm-6am)
  ov_respectful            boolean default false,
  ov_no_room_entry         boolean default false,

  -- Calculated fields
  am_pts                   integer default 0,
  pm_pts                   integer default 0,
  ov_pts                   integer default 0,
  minor_infractions        integer default 0,
  major_infractions        integer default 0,
  total_pts                integer default 0,
  level_achieved           text,
  privilege_freeze_until   timestamptz,

  -- Notes
  positive_experiences     text,
  staff_notes              text,
  entered_by               uuid references public.admins(id) on delete set null,

  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),

  unique (kid_id, date)
);

-- ============================================================
-- DAILY EARNINGS
-- ============================================================
create table public.daily_earnings (
  id           uuid primary key default uuid_generate_v4(),
  kid_id       uuid references public.kids(id) on delete cascade not null,
  date         date not null,
  reading_log  boolean default false,
  planner      boolean default false,
  mindfulness  boolean default false,
  total_earned decimal(5,2) default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (kid_id, date)
);

-- ============================================================
-- CANTEEN REDEMPTIONS
-- ============================================================
create table public.canteen_redemptions (
  id               uuid primary key default uuid_generate_v4(),
  kid_id           uuid references public.kids(id) on delete cascade not null,
  redeemed_at      timestamptz default now(),
  points_redeemed  integer not null,
  notes            text,
  entered_by       uuid references public.admins(id) on delete set null,
  created_at       timestamptz default now()
);

-- ============================================================
-- WEEKLY AWARDS
-- ============================================================
create table public.weekly_awards (
  id                  uuid primary key default uuid_generate_v4(),
  week_start_date     date not null,
  kid_id              uuid references public.kids(id) on delete cascade not null,
  award_type          text not null check (award_type in ('kid_of_week', 'kid_of_month')),
  auto_calculated     boolean default true,
  confirmed_by_admin  uuid references public.admins(id) on delete set null,
  created_at          timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.admins             enable row level security;
alter table public.kids               enable row level security;
alter table public.daily_logs         enable row level security;
alter table public.daily_earnings     enable row level security;
alter table public.canteen_redemptions enable row level security;
alter table public.weekly_awards      enable row level security;

-- Helper: check if current user is an admin
create or replace function public.is_admin()
returns boolean language sql security definer
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- Helper: get kid_id for current user
create or replace function public.my_kid_id()
returns uuid language sql security definer
as $$
  select id from public.kids where user_id = auth.uid() limit 1;
$$;

-- ADMINS table: admins can read all; no one else can read
create policy "admins_select" on public.admins for select using (is_admin());
create policy "admins_insert" on public.admins for insert with check (is_admin());
create policy "admins_update" on public.admins for update using (is_admin());

-- KIDS table
create policy "kids_admin_all"   on public.kids for all using (is_admin());
create policy "kids_own_select"  on public.kids for select using (user_id = auth.uid());

-- DAILY LOGS
create policy "logs_admin_all"   on public.daily_logs for all using (is_admin());
create policy "logs_own_select"  on public.daily_logs for select using (kid_id = my_kid_id());

-- DAILY EARNINGS
create policy "earn_admin_all"   on public.daily_earnings for all using (is_admin());
create policy "earn_own_select"  on public.daily_earnings for select using (kid_id = my_kid_id());

-- CANTEEN REDEMPTIONS
create policy "canteen_admin_all"  on public.canteen_redemptions for all using (is_admin());
create policy "canteen_own_select" on public.canteen_redemptions for select using (kid_id = my_kid_id());

-- WEEKLY AWARDS
create policy "awards_admin_all"  on public.weekly_awards for all using (is_admin());
create policy "awards_public_select" on public.weekly_awards for select using (true); -- all users can see awards

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_logs_updated_at before update on public.daily_logs
  for each row execute procedure public.set_updated_at();

create trigger daily_earnings_updated_at before update on public.daily_earnings
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- SEED: Create first admin (run after creating your Supabase auth user)
-- Replace 'YOUR_AUTH_USER_ID' with the UUID from auth.users
-- ============================================================
-- insert into public.admins (user_id, name) values ('YOUR_AUTH_USER_ID', 'Admin');
