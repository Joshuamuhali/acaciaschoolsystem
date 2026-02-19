-- Create Super Admin User
-- Replace 'acaciaprojects86@gmail.com' and your desired password

-- Step 1: Create the user in auth.users
-- This should be done via Supabase Dashboard or signup

-- Step 2: After user exists, assign Super Admin role
-- Run this after the user is created:

INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 
  'SuperAdmin'::app_role
FROM auth.users 
WHERE email = 'acaciaprojects86@gmail.com';

-- Verify the role was assigned
SELECT 
  u.email,
  ur.role,
  u.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'acaciaprojects86@gmail.com';
