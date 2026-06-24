-- Staff/admin accounts now set their own password at creation time.
-- Birthday is no longer used to derive the password; keep it as optional info.
-- Run in Supabase SQL editor.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS birthday date;
