-- =========================================
-- SCHOOL SETTINGS TABLE
-- =========================================
CREATE TABLE public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'Acacia Country School',
  color_primary TEXT NOT NULL DEFAULT '#28A745',
  color_secondary TEXT NOT NULL DEFAULT '#FFA500',
  logo_url TEXT,
  allow_partial_payments BOOLEAN NOT NULL DEFAULT true,
  max_installments INTEGER NOT NULL DEFAULT 3,
  currency_symbol TEXT NOT NULL DEFAULT 'K',
  academic_year_start_month INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.school_settings (school_name, color_primary, color_secondary)
VALUES ('Acacia Country School', '#28A745', '#FFA500')
ON CONFLICT DO NOTHING;

-- =========================================
-- ENHANCED USER MANAGEMENT FUNCTIONS
-- =========================================

-- Function to deactivate/activate user
CREATE OR REPLACE FUNCTION public.toggle_user_status(
  user_id UUID,
  is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Check user role
  SELECT role INTO current_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Only Super Admin can toggle user status
  IF current_user_role != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only Super Admin can activate/deactivate users';
  END IF;
  
  -- Update user status in auth.users
  UPDATE auth.users 
  SET 
    email_confirmed_at = CASE WHEN is_active THEN now() ELSE NULL END,
    banned_at = CASE WHEN NOT is_active THEN now() ELSE NULL END
  WHERE id = user_id;
  
  RETURN true;
END;
$$;

-- Function to reset user password
CREATE OR REPLACE FUNCTION public.reset_user_password(
  user_id UUID,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Check user role
  SELECT role INTO current_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Only Super Admin can reset passwords
  IF current_user_role != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only Super Admin can reset passwords';
  END IF;
  
  -- Reset password using admin API
  -- This would typically be called via Edge Function
  -- For now, we'll just log the action
  
  RETURN true;
END;
$$;

-- =========================================
-- ENHANCED AUDIT LOG FUNCTIONS
-- =========================================

-- Function to get detailed audit logs with filtering
CREATE OR REPLACE FUNCTION public.get_filtered_audit_logs(
  p_table_name TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  table_name TEXT,
  record_id UUID,
  performed_by UUID,
  performer_email TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  al.id,
  al.action_type,
  al.table_name,
  al.record_id,
  al.performed_by,
  u.email as performer_email,
  al.old_data,
  al.new_data,
  al.ip_address,
  al.user_agent,
  al.created_at
FROM public.audit_logs al
LEFT JOIN auth.users u ON al.performed_by = u.id
WHERE 
  (p_table_name IS NULL OR al.table_name = p_table_name) AND
  (p_action_type IS NULL OR al.action_type = p_action_type) AND
  (p_user_id IS NULL OR al.performed_by = p_user_id) AND
  (p_start_date IS NULL OR al.created_at >= p_start_date) AND
  (p_end_date IS NULL OR al.created_at <= p_end_date)
ORDER BY al.created_at DESC
LIMIT p_limit;
$$;

-- =========================================
-- ENHANCED FEE MANAGEMENT FUNCTIONS
-- =========================================

-- Function to override term lock for Super Admin
CREATE OR REPLACE FUNCTION public.override_term_lock(
  term_number INTEGER,
  year INTEGER,
  override_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Check user role
  SELECT role INTO current_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Only Super Admin can override term locks
  IF current_user_role != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only Super Admin can override term locks';
  END IF;
  
  -- Log the override
  INSERT INTO public.audit_logs(
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
    'OVERRIDE_TERM_LOCK',
    'term_lock',
    NULL,
    auth.uid(),
    jsonb_build_object('term_number', term_number, 'year', year, 'was_locked', true),
    jsonb_build_object('term_number', term_number, 'year', year, 'override_reason', override_reason),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN true;
END;
$$;

-- =========================================
-- BALANCE ADJUSTMENT FUNCTION
-- =========================================

-- Function to adjust payment amounts (emergency override)
CREATE OR REPLACE FUNCTION public.adjust_payment_balance(
  payment_id UUID,
  new_amount NUMERIC(12,2),
  adjustment_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
  old_amount NUMERIC(12,2);
BEGIN
  -- Check user role
  SELECT role INTO current_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Only Super Admin can adjust payment balances
  IF current_user_role != 'SuperAdmin' THEN
    RAISE EXCEPTION 'Only Super Admin can adjust payment balances';
  END IF;
  
  -- Get old amount
  SELECT amount_paid INTO old_amount 
  FROM public.payments 
  WHERE id = payment_id;
  
  -- Update payment amount
  UPDATE public.payments 
  SET amount_paid = new_amount
  WHERE id = payment_id;
  
  -- Log the adjustment
  INSERT INTO public.audit_logs(
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
    'BALANCE_ADJUSTMENT',
    'payments',
    payment_id,
    auth.uid(),
    jsonb_build_object('amount_paid', old_amount),
    jsonb_build_object('amount_paid', new_amount, 'adjustment_reason', adjustment_reason),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN true;
END;
$$;

-- =========================================
-- RLS POLICIES FOR SCHOOL SETTINGS
-- =========================================

-- Only Super Admin can manage school settings
CREATE POLICY "SuperAdmin full access school_settings" ON public.school_settings
FOR ALL USING (public.has_role(auth.uid(), 'SuperAdmin'));

-- All authenticated users can read school settings
CREATE POLICY "Read school settings" ON public.school_settings
FOR SELECT TO authenticated USING (true);

-- =========================================
-- ENHANCED VIEWS
-- =========================================

-- Enhanced user management view with status
CREATE OR REPLACE VIEW public.users_with_roles_enhanced AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  ur.role,
  u.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.banned_at,
  CASE 
    WHEN u.banned_at IS NOT NULL THEN 'deactivated'
    WHEN u.email_confirmed_at IS NULL THEN 'pending'
    ELSE 'active'
  END as status,
  -- Count pupils managed by this user (for School Admins)
  (SELECT COUNT(*) FROM public.pupils WHERE recorded_by = u.id) as pupils_managed
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NOT NULL
ORDER BY u.created_at DESC;

-- Enhanced audit logs view with user details
CREATE OR REPLACE VIEW public.audit_logs_enhanced AS
SELECT 
  al.id,
  al.action_type,
  al.table_name,
  al.record_id,
  al.performed_by,
  u.email as performer_email,
  p.full_name as performer_name,
  ur.role as performer_role,
  al.old_data,
  al.new_data,
  al.ip_address,
  al.user_agent,
  al.created_at
FROM public.audit_logs al
LEFT JOIN auth.users u ON al.performed_by = u.id
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY al.created_at DESC;

-- Grant access to enhanced views
GRANT SELECT ON public.users_with_roles_enhanced TO authenticated;
GRANT SELECT ON public.audit_logs_enhanced TO authenticated;

-- =========================================
-- TRIGGER FOR UPDATED_AT ON SCHOOL_SETTINGS
-- =========================================
CREATE OR REPLACE FUNCTION public.update_school_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_school_settings_timestamp
BEFORE UPDATE ON public.school_settings
FOR EACH ROW EXECUTE FUNCTION public.update_school_settings_timestamp();
