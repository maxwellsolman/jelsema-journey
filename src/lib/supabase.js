import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://xotjgxrpdfjrkwfdusjd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdGpneHJwZGZqcmt3ZmR1c2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDIxMjIsImV4cCI6MjA5MTg3ODEyMn0.q_nP2d4ZadGVBJREwP3lgnWJLLv3xP0ixkYC7wIltvU'
)
