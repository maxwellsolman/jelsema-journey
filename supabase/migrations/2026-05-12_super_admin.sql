-- Adds super-admin flag and initials to the admins table.
-- Run in Supabase SQL editor.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS initials text;

-- Make Gabbi the initial super-admin
UPDATE admins SET is_super_admin = true WHERE email = 'ggarcia@fkcs.org';
