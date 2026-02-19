-- =========================================
-- COMPLETE PRD IMPLEMENTATION FOR ACACIA COUNTRY SCHOOL
-- Includes: Term Lock, Director Approval, Balance Views, Enhanced RLS
-- =========================================

-- =========================================
-- 1. ROLES & USER MANAGEMENT
-- =========================================
CREATE TYPE public.app_role AS ENUM ('Director', 'SuperAdmin', 'SchoolAdmin');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- =========================================
-- 2. PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- 3. GRADES
-- =========================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 4. PARENTS
-- =========================================
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT,
  account_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. PUPILS
-- =========================================
CREATE TABLE public.pupils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  grade_id UUID REFERENCES public.grades(id),
  parent_id UUID REFERENCES public.parents(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pupils ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 6. FEES
-- =========================================
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL CHECK (term_number IN (1,2,3)),
  year INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade_id, term_number, year)
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 7. PAYMENTS (Enhanced with Approval Workflow)
-- =========================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES public.pupils(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL CHECK (term_number IN (1,2,3)),
  year INTEGER NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  -- Approval workflow fields
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 8. AUDIT LOGS (Enhanced with IP tracking)
-- =========================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 9. TERM LOCK SYSTEM
-- =========================================
CREATE TABLE public.term_lock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_number INTEGER NOT NULL CHECK (term_number IN (1,2,3)),
  year INTEGER NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_number, year)
);
ALTER TABLE public.term_lock ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 10. BALANCE CALCULATION VIEWS
-- =========================================

-- Balance per pupil view
CREATE OR REPLACE VIEW public.balance_per_pupil AS
SELECT 
  p.id AS pupil_id,
  p.full_name AS pupil_name,
  g.name AS grade_name,
  par.full_name AS parent_name,
  COALESCE(f.amount, 0) AS expected_amount,
  COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) AS collected_amount,
  COALESCE(f.amount, 0) - COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) AS balance_amount,
  CASE 
    WHEN COALESCE(f.amount, 0) - COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) <= 0 THEN 'paid'
    WHEN COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END AS payment_status
FROM public.pupils p
LEFT JOIN public.grades g ON p.grade_id = g.id
LEFT JOIN public.parents par ON p.parent_id = par.id
LEFT JOIN public.fees f ON p.grade_id = f.grade_id AND f.is_active = true
LEFT JOIN public.payments pay ON p.id = pay.pupil_id 
  AND pay.term_number = f.term_number 
  AND pay.year = f.year
WHERE p.status = 'active'
GROUP BY p.id, p.full_name, g.name, par.full_name, f.amount;

-- Grade summary view
CREATE OR REPLACE VIEW public.grade_summary AS
SELECT 
  g.id AS grade_id,
  g.name AS grade_name,
  COUNT(DISTINCT p.id) AS total_pupils,
  COALESCE(SUM(f.amount), 0) AS total_expected,
  COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) AS total_collected,
  COALESCE(SUM(f.amount), 0) - COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) AS total_pending,
  COUNT(DISTINCT CASE WHEN pay.is_deleted = false AND pay.approval_status = 'approved' AND pay.amount_paid >= f.amount THEN p.id END) AS fully_paid_pupils,
  COUNT(DISTINCT CASE WHEN pay.is_deleted = false AND pay.approval_status = 'approved' AND pay.amount_paid < f.amount AND pay.amount_paid > 0 THEN p.id END) AS partially_paid_pupils,
  COUNT(DISTINCT CASE WHEN COALESCE(SUM(pay.amount_paid) FILTER (WHERE pay.is_deleted = false AND pay.approval_status = 'approved'), 0) = 0 THEN p.id END) AS unpaid_pupils
FROM public.grades g
LEFT JOIN public.pupils p ON g.id = p.grade_id AND p.status = 'active'
LEFT JOIN public.fees f ON g.id = f.grade_id AND f.is_active = true
LEFT JOIN public.payments pay ON p.id = pay.pupil_id 
  AND pay.term_number = f.term_number 
  AND pay.year = f.year
GROUP BY g.id, g.name;

-- Pending approvals view for Director
CREATE OR REPLACE VIEW public.pending_deletion_approvals AS
SELECT 
  p.id AS payment_id,
  p.pupil_id,
  pup.full_name AS pupil_name,
  g.name AS grade_name,
  p.amount_paid,
  p.payment_date,
  p.deletion_reason,
  p.deleted_at,
  rec.full_name AS recorded_by_name,
  del.full_name AS deleted_by_name
FROM public.payments p
JOIN public.pupils pup ON p.pupil_id = pup.id
JOIN public.grades g ON pup.grade_id = g.id
LEFT JOIN auth.users rec ON p.recorded_by = rec.id
LEFT JOIN auth.users del ON p.deleted_by = del.id
WHERE p.is_deleted = true 
  AND p.approval_status = 'pending_approval'
ORDER BY p.deleted_at DESC;

-- =========================================
-- 11. ENHANCED AUDIT TRIGGER WITH IP TRACKING
-- =========================================
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs(action_type, table_name, record_id, performed_by, new_data, ip_address, user_agent)
    VALUES (
      'INSERT', 
      TG_TABLE_NAME, 
      NEW.id, 
      auth.uid(), 
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs(action_type, table_name, record_id, performed_by, old_data, new_data, ip_address, user_agent)
    VALUES (
      CASE 
        WHEN TG_TABLE_NAME = 'payments' AND NEW.is_deleted = true AND OLD.is_deleted = false THEN 'SOFT_DELETE'
        WHEN TG_TABLE_NAME = 'payments' AND NEW.approval_status = 'approved' AND OLD.approval_status = 'pending_approval' THEN 'APPROVE_DELETION'
        WHEN TG_TABLE_NAME = 'payments' AND NEW.approval_status = 'rejected' AND OLD.approval_status = 'pending_approval' THEN 'REJECT_DELETION'
        WHEN TG_TABLE_NAME = 'term_lock' AND NEW.is_locked = true AND OLD.is_locked = false THEN 'LOCK_TERM'
        WHEN TG_TABLE_NAME = 'term_lock' AND NEW.is_locked = false AND OLD.is_locked = true THEN 'UNLOCK_TERM'
        ELSE 'UPDATE' 
      END,
      TG_TABLE_NAME, 
      NEW.id, 
      auth.uid(), 
      to_jsonb(OLD), 
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit triggers
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_fees AFTER INSERT OR UPDATE ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_pupils AFTER INSERT OR UPDATE ON public.pupils
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_parents AFTER INSERT OR UPDATE ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_term_lock AFTER INSERT OR UPDATE ON public.term_lock
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- =========================================
-- 12. TERM LOCK VALIDATION TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.check_term_lock()
RETURNS TRIGGER AS $$
DECLARE
  locked BOOLEAN;
BEGIN
  -- Check if term is locked for inserts and updates
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT is_locked INTO locked 
    FROM public.term_lock 
    WHERE term_number = NEW.term_number AND year = NEW.year;
    
    IF locked THEN
      RAISE EXCEPTION 'Cannot modify payments: term %, year % is locked', NEW.term_number, NEW.year;
    END IF;
  END IF;
  
  -- For deletes, check old record
  IF TG_OP = 'DELETE' THEN
    SELECT is_locked INTO locked 
    FROM public.term_lock 
    WHERE term_number = OLD.term_number AND year = OLD.year;
    
    IF locked THEN
      RAISE EXCEPTION 'Cannot delete payments: term %, year % is locked', OLD.term_number, OLD.year;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER payments_term_lock_check 
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.check_term_lock();

-- =========================================
-- 13. PREVENT HARD DELETE ON PAYMENTS
-- =========================================
CREATE OR REPLACE FUNCTION public.prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete not allowed on payments. Use soft delete with approval workflow.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER no_hard_delete_payments 
BEFORE DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_delete();

-- =========================================
-- 14. COMPLETE RLS POLICIES
-- =========================================

-- user_roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "SuperAdmin full access user_roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'SuperAdmin'));

-- profiles policies
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

-- grades policies
CREATE POLICY "Read grades" ON public.grades
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage grades" ON public.grades
FOR ALL USING (public.has_any_role(auth.uid()));

-- parents policies
CREATE POLICY "Read parents" ON public.parents
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert parents" ON public.parents
FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update parents" ON public.parents
FOR UPDATE USING (public.has_any_role(auth.uid()));

CREATE POLICY "Delete parents" ON public.parents
FOR DELETE USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

-- pupils policies
CREATE POLICY "Read pupils" ON public.pupils
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert pupils" ON public.pupils
FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update pupils" ON public.pupils
FOR UPDATE USING (public.has_any_role(auth.uid()));

CREATE POLICY "Delete pupils" ON public.pupils
FOR DELETE USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

-- fees policies
CREATE POLICY "Read fees" ON public.fees
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert fees" ON public.fees
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

CREATE POLICY "Update fees" ON public.fees
FOR UPDATE USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

CREATE POLICY "Delete fees" ON public.fees
FOR DELETE USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

-- payments policies (Enhanced with approval workflow)
CREATE POLICY "Read payments" ON public.payments
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert payments" ON public.payments
FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "School Admin soft delete payments" ON public.payments
FOR UPDATE USING (
  public.has_role(auth.uid(), 'SchoolAdmin') AND
  is_deleted = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'SchoolAdmin') AND
  is_deleted = true AND
  approval_status = 'pending_approval'
);

CREATE POLICY "Director approve delete payments" ON public.payments
FOR UPDATE USING (
  public.has_role(auth.uid(), 'Director') AND
  is_deleted = true AND
  approval_status = 'pending_approval'
)
WITH CHECK (
  public.has_role(auth.uid(), 'Director') AND
  approval_status IN ('approved', 'rejected')
);

CREATE POLICY "SuperAdmin full access payments" ON public.payments
FOR ALL USING (public.has_role(auth.uid(), 'SuperAdmin'));

-- audit_logs policies
CREATE POLICY "Read audit logs" ON public.audit_logs
FOR SELECT USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

CREATE POLICY "Insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- term_lock policies
CREATE POLICY "Read term lock" ON public.term_lock
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Manage term lock" ON public.term_lock
FOR ALL USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

-- Views policies (inherit from base tables)
CREATE POLICY "Read balance per pupil" ON public.balance_per_pupil
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Read grade summary" ON public.grade_summary
FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Read pending approvals" ON public.pending_deletion_approvals
FOR SELECT USING (
  public.has_role(auth.uid(), 'Director') OR 
  public.has_role(auth.uid(), 'SuperAdmin')
);

-- =========================================
-- 15. UTILITY FUNCTIONS FOR EDGE FUNCTIONS
-- =========================================

-- Function to approve payment deletion
CREATE OR REPLACE FUNCTION public.approve_payment_deletion(
  payment_id UUID,
  approve BOOLEAN,
  rejection_reason TEXT DEFAULT NULL
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
  
  -- Only Director or SuperAdmin can approve
  IF current_user_role NOT IN ('Director', 'SuperAdmin') THEN
    RAISE EXCEPTION 'Only Director or SuperAdmin can approve payment deletions';
  END IF;
  
  -- Update payment approval status
  IF approve THEN
    UPDATE public.payments 
    SET 
      approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
    WHERE id = payment_id AND is_deleted = true AND approval_status = 'pending_approval';
  ELSE
    UPDATE public.payments 
    SET 
      approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = rejection_reason
    WHERE id = payment_id AND is_deleted = true AND approval_status = 'pending_approval';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to lock/unlock term
CREATE OR REPLACE FUNCTION public.manage_term_lock(
  term_number_param INTEGER,
  year_param INTEGER,
  lock BOOLEAN,
  lock_reason TEXT DEFAULT NULL
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
  
  -- Only Director or SuperAdmin can manage term locks
  IF current_user_role NOT IN ('Director', 'SuperAdmin') THEN
    RAISE EXCEPTION 'Only Director or SuperAdmin can manage term locks';
  END IF;
  
  -- Upsert term lock record
  INSERT INTO public.term_lock (term_number, year, is_locked, locked_by, locked_at, lock_reason)
  VALUES (term_number_param, year_param, lock, auth.uid(), now(), lock_reason)
  ON CONFLICT (term_number, year)
  DO UPDATE SET
    is_locked = lock,
    locked_by = auth.uid(),
    locked_at = now(),
    lock_reason = lock_reason;
  
  RETURN true;
END;
$$;

-- =========================================
-- 16. SAMPLE DATA INSERTION (Optional)
-- =========================================

-- Insert sample grades
INSERT INTO public.grades (name) VALUES 
('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6'), ('Grade 7')
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- MIGRATION COMPLETE
-- =========================================
