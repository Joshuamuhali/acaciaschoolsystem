-- Assign Super Admin role to acaciaprojects86@gmail.com
-- Run this in Supabase SQL Editor

-- First, get the user ID
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'acaciaprojects86@gmail.com';

-- Update user metadata to include Super Admin role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'),
  '{role}',
  '"SuperAdmin"'
)
WHERE email = 'acaciaprojects86@gmail.com';

-- Insert into user_roles table (if it exists)
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  id,
  'SuperAdmin',
  id,
  NOW()
FROM auth.users 
WHERE email = 'acaciaprojects86@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'SuperAdmin',
  assigned_by = id,
  assigned_at = NOW();

-- Verify the role was assigned
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data,
  ur.role,
  ur.assigned_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'acaciaprojects86@gmail.com';
