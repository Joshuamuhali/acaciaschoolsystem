-- Create view for user management
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  ur.role,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NOT NULL
ORDER BY u.created_at DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.users_with_roles TO authenticated;
GRANT SELECT ON public.users_with_roles TO anon;
