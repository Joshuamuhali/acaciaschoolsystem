-- Check authentication status for acaciaprojects86@gmail.com
-- This SQL will help verify the user's authentication and role assignment

-- 1. Check if the user exists in auth.users
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  banned_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'acaciaprojects86@gmail.com';

-- 2. Check if user has a profile
SELECT 
  p.id,
  p.full_name,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'acaciaprojects86@gmail.com';

-- 3. Check user's role assignment
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'acaciaprojects86@gmail.com';

-- 4. Check if user has any permissions (if RBAC is implemented)
SELECT 
  COUNT(*) as permission_count
FROM public.user_permissions up
JOIN auth.users u ON up.user_id = u.id
WHERE u.email = 'acaciaprojects86@gmail.com' AND up.granted = true;

-- 5. Check recent authentication attempts (if logging is available)
SELECT 
  created_at,
  success,
  ip_address
FROM public.resource_access_log ral
JOIN auth.users u ON ral.user_id = u.id
WHERE u.email = 'acaciaprojects86@gmail.com'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if user can access Super Admin features
SELECT 
  public.has_role(u.id, 'SuperAdmin') as is_super_admin,
  public.has_permission(u.id, 'system', 'settings') as can_manage_settings,
  public.has_permission(u.id, 'users', 'create') as can_create_users,
  public.has_permission(u.id, 'payments', 'create') as can_create_payments
FROM auth.users u
WHERE u.email = 'acaciaprojects86@gmail.com';
