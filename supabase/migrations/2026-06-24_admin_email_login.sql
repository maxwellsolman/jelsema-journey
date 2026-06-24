-- Staff/admin accounts now log in with their real email address.
-- Store it on the admin record for display in Manage Staff.
-- Run in Supabase SQL editor.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS email text;
