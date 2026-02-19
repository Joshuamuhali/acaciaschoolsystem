-- =========================================
-- ENHANCED RLS POLICIES WITH RBAC INTEGRATION
-- =========================================

-- Drop existing policies to recreate with RBAC
DROP POLICY IF EXISTS "Users can view all pupils" ON public.pupils;
DROP POLICY IF EXISTS "Users can insert pupils" ON public.pupils;
DROP POLICY IF EXISTS "Users can update pupils" ON public.pupils;
DROP POLICY IF EXISTS "Users can delete pupils" ON public.pupils;
DROP POLICY IF EXISTS "Users can view all parents" ON public.parents;
DROP POLICY IF EXISTS "Users can insert parents" ON public.parents;
DROP POLICY IF EXISTS "Users can update parents" ON public.parents;
DROP POLICY IF EXISTS "Users can delete parents" ON public.parents;
DROP POLICY IF EXISTS "Users can view all fees" ON public.fees;
DROP POLICY IF EXISTS "Users can insert fees" ON public.fees;
DROP POLICY IF EXISTS "Users can update fees" ON public.fees;
DROP POLICY IF EXISTS "Users can delete fees" ON public.fees;
DROP POLICY IF EXISTS "Users can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view all grades" ON public.grades;
DROP POLICY IF EXISTS "Users can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Users can update grades" ON public.grades;
DROP POLICY IF EXISTS "Users can delete grades" ON public.grades;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can delete audit logs" ON public.audit_logs;

-- =========================================
-- PUPILS RLS POLICIES
-- =========================================

-- Read access to pupils
CREATE POLICY "Pupils read access" ON public.pupils
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'pupils', 'read'));

-- Create access to pupils
CREATE POLICY "Pupils create access" ON public.pupils
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'pupils', 'create'));

-- Update access to pupils
CREATE POLICY "Pupils update access" ON public.pupils
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'pupils', 'update'))
WITH CHECK (public.has_permission(auth.uid(), 'pupils', 'update'));

-- Delete access to pupils
CREATE POLICY "Pupils delete access" ON public.pupils
FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'pupils', 'delete'));

-- =========================================
-- PARENTS RLS POLICIES
-- =========================================

-- Read access to parents
CREATE POLICY "Parents read access" ON public.parents
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'parents', 'read'));

-- Create access to parents
CREATE POLICY "Parents create access" ON public.parents
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'parents', 'create'));

-- Update access to parents
CREATE POLICY "Parents update access" ON public.parents
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'parents', 'update'))
WITH CHECK (public.has_permission(auth.uid(), 'parents', 'update'));

-- Delete access to parents
CREATE POLICY "Parents delete access" ON public.parents
FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'parents', 'delete'));

-- =========================================
-- FEES RLS POLICIES
-- =========================================

-- Read access to fees
CREATE POLICY "Fees read access" ON public.fees
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'fees', 'read'));

-- Create access to fees
CREATE POLICY "Fees create access" ON public.fees
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'fees', 'create'));

-- Update access to fees
CREATE POLICY "Fees update access" ON public.fees
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'fees', 'update'))
WITH CHECK (public.has_permission(auth.uid(), 'fees', 'update'));

-- Delete access to fees
CREATE POLICY "Fees delete access" ON public.fees
FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'fees', 'delete'));

-- =========================================
-- PAYMENTS RLS POLICIES
-- =========================================

-- Read access to payments
CREATE POLICY "Payments read access" ON public.payments
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'payments', 'read'));

-- Create access to payments
CREATE POLICY "Payments create access" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'payments', 'create'));

-- Update access to payments
CREATE POLICY "Payments update access" ON public.payments
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'payments', 'update'))
WITH CHECK (public.has_permission(auth.uid(), 'payments', 'update'));

-- Soft delete access to payments
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

-- Approve deletion access to payments
CREATE POLICY "Payments approve delete access" ON public.payments
FOR UPDATE TO authenticated
USING (
  public.has_permission(auth.uid(), 'payments', 'approve_delete') AND
  is_deleted = true AND
  approval_status = 'pending_approval'
);

-- =========================================
-- GRADES RLS POLICIES
-- =========================================

-- Read access to grades
CREATE POLICY "Grades read access" ON public.grades
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'grades', 'read'));

-- Create access to grades
CREATE POLICY "Grades create access" ON public.grades
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'grades', 'create'));

-- Update access to grades
CREATE POLICY "Grades update access" ON public.grades
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'grades', 'update'))
WITH CHECK (public.has_permission(auth.uid(), 'grades', 'update'));

-- Delete access to grades
CREATE POLICY "Grades delete access" ON public.grades
FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'grades', 'delete'));

-- =========================================
-- AUDIT LOGS RLS POLICIES
-- =========================================

-- Read access to audit logs
CREATE POLICY "Audit logs read access" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'audit_logs', 'read'));

-- Insert access to audit logs (system only)
CREATE POLICY "Audit logs insert access" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'audit_logs', 'create'));

-- =========================================
-- USER ROLES RLS POLICIES
-- =========================================

-- Read access to user roles (admin only)
CREATE POLICY "User roles read access" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'users', 'read'));

-- Insert access to user roles (admin only)
CREATE POLICY "User roles create access" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users', 'assign_role'));

-- Update access to user roles (admin only)
CREATE POLICY "User roles update access" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'users', 'assign_role'))
WITH CHECK (public.has_permission(auth.uid(), 'users', 'assign_role'));

-- Delete access to user roles (admin only)
CREATE POLICY "User roles delete access" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'users', 'delete'));

-- =========================================
-- SCHOOL SETTINGS RLS POLICIES
-- =========================================

-- Read access to school settings
CREATE POLICY "School settings read access" ON public.school_settings
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'system', 'settings'));

-- Update access to school settings
CREATE POLICY "School settings update access" ON public.school_settings
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'system', 'settings'))
WITH CHECK (public.has_permission(auth.uid(), 'system', 'settings'));

-- =========================================
-- TERM LOCK RLS POLICIES
-- =========================================

-- Read access to term lock
CREATE POLICY "Term lock read access" ON public.term_lock
FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'term', 'read'));

-- Update access to term lock
CREATE POLICY "Term lock update access" ON public.term_lock
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'term', 'lock') OR public.has_permission(auth.uid(), 'term', 'unlock'))
WITH CHECK (public.has_permission(auth.uid(), 'term', 'lock') OR public.has_permission(auth.uid(), 'term', 'unlock'));

-- =========================================
-- ENHANCED VIEWS WITH RLS
-- =========================================

-- Create view for user's accessible pupils
CREATE OR REPLACE VIEW public.my_pupils AS
SELECT 
  p.*,
  g.name as grade_name
FROM public.pupils p
JOIN public.grades g ON p.grade_id = g.id
WHERE 
  (public.has_permission(auth.uid(), 'pupils', 'read') AND 
   (p.recorded_by = auth.uid() OR public.has_permission(auth.uid(), 'pupils', 'read_all')))
  OR public.has_permission(auth.uid(), 'pupils', 'read');

-- Create view for user's accessible payments
CREATE OR REPLACE VIEW public.my_payments AS
SELECT 
  pa.*,
  pu.full_name as pupil_name,
  pu.status as pupil_status,
  g.name as grade_name,
  pa.recorded_by = auth.uid() as is_my_payment
FROM public.payments pa
JOIN public.pupils pu ON pa.pupil_id = pu.id
JOIN public.grades g ON pu.grade_id = g.id
WHERE 
  (public.has_permission(auth.uid(), 'payments', 'read') AND 
   (pa.recorded_by = auth.uid() OR public.has_permission(auth.uid(), 'payments', 'read_all')))
  OR public.has_permission(auth.uid(), 'payments', 'read');

-- Create view for user's accessible parents
CREATE OR REPLACE VIEW public.my_parents AS
SELECT 
  pa.*,
  COUNT(p.id) as pupil_count
FROM public.parents pa
LEFT JOIN public.pupils p ON pa.id = p.parent_id
WHERE 
  (public.has_permission(auth.uid(), 'parents', 'read') AND 
   (p.recorded_by = auth.uid() OR public.has_permission(auth.uid(), 'parents', 'read_all')))
  OR public.has_permission(auth.uid(), 'parents', 'read')
GROUP BY pa.id, pa.full_name, pa.email, pa.phone, pa.address, pa.created_at;

-- Grant access to views
GRANT SELECT ON public.my_pupils TO authenticated;
GRANT SELECT ON public.my_payments TO authenticated;
GRANT SELECT ON public.my_parents TO authenticated;

-- =========================================
-- TRIGGERS FOR AUDITING
-- =========================================

-- Enhanced trigger for pupil operations
CREATE OR REPLACE FUNCTION public.audit_pupil_operations()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Log the operation
  INSERT INTO public.audit_logs (
    action_type,
    table_name,
    record_id,
    performed_by,
    old_data,
    new_data,
    ip_address,
    user_agent
  )
  VALUES (
    action_type,
    'pupils',
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_pupil_operations
AFTER INSERT OR UPDATE OR DELETE ON public.pupils
FOR EACH ROW EXECUTE FUNCTION public.audit_pupil_operations();

-- Enhanced trigger for payment operations
CREATE OR REPLACE FUNCTION public.audit_payment_operations()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      action_type := 'SOFT_DELETE';
    ELSIF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending_approval' THEN
      action_type := 'APPROVE_DELETION';
    ELSIF NEW.approval_status = 'rejected' AND OLD.approval_status = 'pending_approval' THEN
      action_type := 'REJECT_DELETION';
    ELSE
      action_type := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Log the operation
  INSERT INTO public.audit_logs (
    action_type,
    table_name,
    record_id,
    performed_by,
    old_data,
    new_data,
    ip_address,
    user_agent
  )
  VALUES (
    action_type,
    'payments',
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_payment_operations
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_payment_operations();

-- =========================================
-- SECURITY FUNCTIONS
-- =========================================

-- Function to check if user can access specific pupil
CREATE OR REPLACE FUNCTION public.can_access_pupil(pupil_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pupil_owner UUID;
  has_read_permission BOOLEAN;
BEGIN
  -- Check if user has read permission
  SELECT public.has_permission(auth.uid(), 'pupils', 'read') INTO has_read_permission;
  
  IF has_read_permission THEN
    RETURN true;
  END IF;
  
  -- Check if user owns the pupil
  SELECT recorded_by INTO pupil_owner 
  FROM public.pupils 
  WHERE id = pupil_id;
  
  RETURN pupil_owner = auth.uid();
END;
$$;

-- Function to check if user can access specific payment
CREATE OR REPLACE FUNCTION public.can_access_payment(payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_owner UUID;
  has_read_permission BOOLEAN;
BEGIN
  -- Check if user has read permission
  SELECT public.has_permission(auth.uid(), 'payments', 'read') INTO has_read_permission;
  
  IF has_read_permission THEN
    RETURN true;
  END IF;
  
  -- Check if user owns the payment
  SELECT recorded_by INTO payment_owner 
  FROM public.payments 
  WHERE id = payment_id;
  
  RETURN payment_owner = auth.uid();
END;
$$;

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX IF NOT EXISTS idx_pupils_recorded_by ON public.pupils(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON public.payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
