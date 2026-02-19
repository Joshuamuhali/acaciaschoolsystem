-- =========================================
-- ENHANCED RBAC SYSTEM FOR ACACIA COUNTRY SCHOOL
-- =========================================

-- 1. PERMISSIONS TABLE
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL, -- e.g., 'users', 'payments', 'fees', 'audit_logs'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve', 'override'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 2. ROLE_PERMISSIONS TABLE (Many-to-Many)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 3. USER_PERMISSIONS TABLE (For individual overrides)
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true, -- Can be used to deny specific permissions
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- For temporary permissions
  UNIQUE (user_id, permission_id)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. RESOURCE_ACCESS_LOG (Track all resource access)
CREATE TABLE public.resource_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id UUID, -- ID of the specific resource being accessed
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resource_access_log ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. INSERT PERMISSIONS
-- =========================================

-- User Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('users.create', 'Create new users', 'users', 'create'),
('users.read', 'View user information', 'users', 'read'),
('users.update', 'Update user information', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('users.activate', 'Activate/deactivate users', 'users', 'activate'),
('users.assign_role', 'Assign roles to users', 'users', 'assign_role'),
('users.reset_password', 'Reset user passwords', 'users', 'reset_password');

-- Pupil Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('pupils.create', 'Create new pupils', 'pupils', 'create'),
('pupils.read', 'View pupil information', 'pupils', 'read'),
('pupils.update', 'Update pupil information', 'pupils', 'update'),
('pupils.delete', 'Delete pupils', 'pupils', 'delete');

-- Parent Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('parents.create', 'Create new parents', 'parents', 'create'),
('parents.read', 'View parent information', 'parents', 'read'),
('parents.update', 'Update parent information', 'parents', 'update'),
('parents.delete', 'Delete parents', 'parents', 'delete');

-- Payment Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('payments.create', 'Record payments', 'payments', 'create'),
('payments.read', 'View payment information', 'payments', 'read'),
('payments.update', 'Update payment information', 'payments', 'update'),
('payments.delete', 'Delete payments', 'payments', 'delete'),
('payments.soft_delete', 'Soft delete payments', 'payments', 'soft_delete'),
('payments.approve_delete', 'Approve payment deletions', 'payments', 'approve_delete'),
('payments.adjust', 'Adjust payment amounts', 'payments', 'adjust'),
('payments.refund', 'Process refunds', 'payments', 'refund');

-- Fee Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('fees.create', 'Create fee structures', 'fees', 'create'),
('fees.read', 'View fee information', 'fees', 'read'),
('fees.update', 'Update fee structures', 'fees', 'update'),
('fees.delete', 'Delete fee structures', 'fees', 'delete'),
('fees.activate', 'Activate/deactivate fees', 'fees', 'activate');

-- Audit & Reporting Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('audit.read', 'View audit logs', 'audit_logs', 'read'),
('audit.export', 'Export audit data', 'audit_logs', 'export'),
('reports.read', 'View reports', 'reports', 'read'),
('reports.create', 'Generate reports', 'reports', 'create'),
('reports.export', 'Export reports', 'reports', 'export');

-- System Administration Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('system.settings', 'Manage system settings', 'system', 'settings'),
('system.backup', 'Create system backups', 'system', 'backup'),
('system.restore', 'Restore from backup', 'system', 'restore'),
('system.maintenance', 'Perform system maintenance', 'system', 'maintenance'),
('term.lock', 'Lock terms', 'term', 'lock'),
('term.unlock', 'Unlock terms', 'term', 'unlock'),
('term.override', 'Override term locks', 'term', 'override');

-- Grade Management Permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('grades.create', 'Create grades', 'grades', 'create'),
('grades.read', 'View grade information', 'grades', 'read'),
('grades.update', 'Update grade information', 'grades', 'update'),
('grades.delete', 'Delete grades', 'grades', 'delete');

-- =========================================
-- 6. ASSIGN PERMISSIONS TO ROLES
-- =========================================

-- Super Admin: All permissions
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 
  'SuperAdmin'::app_role,
  id,
  (SELECT id FROM auth.users WHERE email = 'acaciaprojects86@gmail.com' LIMIT 1)
FROM public.permissions;

-- Director: Most permissions except system-critical ones
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 
  'Director'::app_role,
  p.id,
  (SELECT id FROM auth.users WHERE email = 'acaciaprojects86@gmail.com' LIMIT 1)
FROM public.permissions p
WHERE p.name NOT IN (
  'system.backup',
  'system.restore',
  'system.maintenance',
  'users.delete',
  'term.override'
);

-- School Admin: Basic operational permissions
INSERT INTO public.role_permissions (role, permission_id, granted_by)
SELECT 
  'SchoolAdmin'::app_role,
  p.id,
  (SELECT id FROM auth.users WHERE email = 'acaciaprojects86@gmail.com' LIMIT 1)
FROM public.permissions p
WHERE p.name IN (
  'pupils.create', 'pupils.read', 'pupils.update',
  'parents.create', 'parents.read', 'parents.update',
  'payments.create', 'payments.read', 'payments.soft_delete',
  'fees.read',
  'grades.read',
  'reports.read'
);

-- =========================================
-- 7. ENHANCED RBAC FUNCTIONS
-- =========================================

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_role_permission BOOLEAN;
  has_user_permission BOOLEAN;
BEGIN
  -- Check role-based permissions
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id
    AND p.resource = _resource
    AND p.action = _action
  ) INTO has_role_permission;
  
  -- Check user-specific permissions (overrides)
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
    AND p.resource = _resource
    AND p.action = _action
    AND up.granted = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) INTO has_user_permission;
  
  -- Check for explicit denial
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
    AND p.resource = _resource
    AND p.action = _action
    AND up.granted = false
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) INTO has_user_permission;
  
  RETURN COALESCE(has_user_permission, has_role_permission, false);
END;
$$;

-- Get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE (
  permission_name TEXT,
  resource TEXT,
  action TEXT,
  source TEXT, -- 'role' or 'user'
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
-- Role permissions
SELECT 
  p.name,
  p.resource,
  p.action,
  'role'::TEXT,
  rp.granted_at,
  NULL::TIMESTAMPTZ
FROM public.role_permissions rp
JOIN public.permissions p ON rp.permission_id = p.id
JOIN public.user_roles ur ON ur.role = rp.role
WHERE ur.user_id = _user_id

UNION ALL

-- User permissions (overrides)
SELECT 
  p.name,
  p.resource,
  p.action,
  'user'::TEXT,
  up.granted_at,
  up.expires_at
FROM public.user_permissions up
JOIN public.permissions p ON up.permission_id = p.id
WHERE up.user_id = _user_id
AND up.granted = true
AND (up.expires_at IS NULL OR up.expires_at > now())
ORDER BY resource, action;
$$;

-- Log resource access attempt
CREATE OR REPLACE FUNCTION public.log_resource_access(
  _user_id UUID,
  _resource TEXT,
  _action TEXT,
  _resource_id UUID DEFAULT NULL,
  _success BOOLEAN DEFAULT true,
  _denial_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resource_access_log (
    user_id, 
    resource, 
    action, 
    resource_id,
    ip_address,
    user_agent,
    success,
    denial_reason
  )
  VALUES (
    _user_id,
    _resource,
    _action,
    _resource_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    _success,
    _denial_reason
  );
END;
$$;

-- =========================================
-- 8. ENHANCED RLS POLICIES USING RBAC
-- =========================================

-- Drop existing policies and recreate with RBAC
DROP POLICY IF EXISTS "Read payments" ON public.payments;
DROP POLICY IF EXISTS "Insert payments" ON public.payments;
DROP POLICY IF EXISTS "Update payments" ON public.payments;

-- Enhanced Payments RLS
CREATE POLICY "Payments read access" ON public.payments
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'payments', 'read'));

CREATE POLICY "Payments create access" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'payments', 'create'));

CREATE POLICY "Payments update access" ON public.payments
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'payments', 'update'));

CREATE POLICY "Payments soft delete access" ON public.payments
FOR UPDATE TO authenticated
USING (
  public.has_permission(auth.uid(), 'payments', 'soft_delete') AND
  is_deleted = false
)
WITH CHECK (
  public.has_permission(auth.uid(), 'payments', 'soft_delete') AND
  is_deleted = true
);

CREATE POLICY "Payments approve delete access" ON public.payments
FOR UPDATE TO authenticated
USING (
  public.has_permission(auth.uid(), 'payments', 'approve_delete') AND
  is_deleted = true AND
  approval_status = 'pending_approval'
);

-- Enhanced Users RLS
DROP POLICY IF EXISTS "Read users" ON public.users_with_roles_enhanced;
DROP POLICY IF EXISTS "Insert users" ON public.users_with_roles_enhanced;

CREATE POLICY "Users read access" ON public.users_with_roles_enhanced
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'users', 'read'));

CREATE POLICY "Users create access" ON public.users_with_roles_enhanced
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users', 'create'));

-- =========================================
-- 9. TRIGGERS FOR ACCESS LOGGING
-- =========================================

CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS TRIGGER AS $$
DECLARE
  has_perm BOOLEAN;
  action_text TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_text := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      action_text := 'soft_delete';
    ELSIF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending_approval' THEN
      action_text := 'approve_delete';
    ELSE
      action_text := 'update';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_text := 'delete';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Check permission
  SELECT public.has_permission(auth.uid(), 'payments', action_text) INTO has_perm;
  
  -- Log access attempt
  PERFORM public.log_resource_access(
    auth.uid(),
    'payments',
    action_text,
    NEW.id,
    has_perm,
    CASE WHEN has_perm THEN NULL ELSE 'Insufficient permissions' END
  );
  
  IF NOT has_perm THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for % on payments', action_text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER payments_access_log
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_payment_access();

-- =========================================
-- 10. VIEWS FOR PERMISSION MANAGEMENT
-- =========================================

-- View all permissions with role assignments
CREATE OR REPLACE VIEW public.permission_matrix AS
SELECT 
  r.role,
  p.name as permission_name,
  p.resource,
  p.action,
  rp.granted_at,
  'role' as source_type
FROM public.role_permissions rp
JOIN public.permissions p ON rp.permission_id = p.id
JOIN (VALUES ('SuperAdmin'), ('Director'), ('SchoolAdmin')) AS r(role) ON r.role = rp.role

UNION ALL

SELECT 
  u.email as role,
  p.name as permission_name,
  p.resource,
  p.action,
  up.granted_at,
  CASE WHEN up.granted THEN 'user_granted' ELSE 'user_denied' END as source_type
FROM public.user_permissions up
JOIN public.permissions p ON up.permission_id = p.id
JOIN auth.users u ON u.id = up.user_id
ORDER BY role, resource, action;

-- View recent access attempts
CREATE OR REPLACE VIEW public.recent_access_attempts AS
SELECT 
  ral.created_at,
  u.email,
  ral.resource,
  ral.action,
  ral.success,
  ral.denial_reason,
  ral.ip_address,
  ral.user_agent
FROM public.resource_access_log ral
JOIN auth.users u ON u.id = ral.user_id
ORDER BY ral.created_at DESC
LIMIT 100;

-- =========================================
-- 11. GRANT ACCESS TO VIEWS
-- =========================================
GRANT SELECT ON public.permission_matrix TO authenticated;
GRANT SELECT ON public.recent_access_attempts TO authenticated;
GRANT SELECT ON public.users_with_roles_enhanced TO authenticated;
GRANT EXECUTE ON public.has_permission TO authenticated;
GRANT EXECUTE ON public.get_user_permissions TO authenticated;
GRANT EXECUTE ON public.log_resource_access TO authenticated;

-- =========================================
-- 12. INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX idx_permissions_resource_action ON public.permissions(resource, action);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX idx_resource_access_log_user ON public.resource_access_log(user_id);
CREATE INDEX idx_resource_access_log_created ON public.resource_access_log(created_at);
