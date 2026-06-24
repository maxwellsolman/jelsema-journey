-- Fix: admins (esp. super-admins) must be able to see ALL staff rows in Manage Staff.
-- The deployed admins SELECT policy was effectively limiting each admin to their own
-- row, so newly added staff were invisible in the list. Re-assert the security-definer
-- helper and an all-rows select policy for admins.
-- Run in Supabase SQL editor.

-- security definer = the function bypasses RLS when it reads admins, so no recursion
create or replace function public.is_admin()
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins
  for select using (public.is_admin());
