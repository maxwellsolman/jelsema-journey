-- ============================================================
-- Jelsema Journey — Migration v3
-- Adds: per-shift attribution, opening balances, existing-youth
-- metadata, DB-backed last-paid-out tracking.
-- Run in Supabase SQL Editor.
-- ============================================================

-- Per-shift attribution on daily_logs
alter table public.daily_logs
  add column if not exists am_entered_by uuid references public.admins(id) on delete set null,
  add column if not exists pm_entered_by uuid references public.admins(id) on delete set null,
  add column if not exists ov_entered_by uuid references public.admins(id) on delete set null,
  add column if not exists am_saved_at   timestamptz,
  add column if not exists pm_saved_at   timestamptz,
  add column if not exists ov_saved_at   timestamptz;

-- Kid metadata: opening balances, existing-youth, payout tracking
alter table public.kids
  add column if not exists opening_points       integer       default 0,
  add column if not exists opening_dollars      decimal(7,2)  default 0,
  add column if not exists is_existing          boolean       default false,
  add column if not exists original_intake_date date,
  add column if not exists prior_notes          text,
  add column if not exists last_paid_out_at     timestamptz,
  add column if not exists last_paid_out_by     uuid references public.admins(id) on delete set null,
  add column if not exists last_paid_out_amount decimal(7,2);
