-- Let staff (esp. super-admins) log in with their initials as a backup to email.
-- The login page is unauthenticated, so it can't read the admins table (RLS).
-- This security-definer function resolves initials -> that staff member's email
-- so the login can sign in with it. Only returns rows that have an email set.
-- Run in Supabase SQL editor.

create or replace function public.staff_login_email(p_login text)
returns text language sql security definer stable
as $$
  select email from public.admins
  where email is not null
    and upper(initials) = upper(trim(p_login))
  limit 1;
$$;

grant execute on function public.staff_login_email(text) to anon, authenticated;

-- Make sure the super-admins have initials set so the backup works.
update public.admins set initials = 'GG' where email = 'ggarcia@fkcs.org' and (initials is null or initials = '');
update public.admins set initials = 'MH' where name = 'Maile Horn' and (initials is null or initials = '');
