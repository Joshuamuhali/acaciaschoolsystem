
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('Director', 'SuperAdmin', 'SchoolAdmin');

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper to check if user has any admin role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles table
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

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Parents
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT,
  account_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Pupils
CREATE TABLE public.pupils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  grade_id UUID REFERENCES public.grades(id),
  parent_id UUID REFERENCES public.parents(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pupils ENABLE ROW LEVEL SECURITY;

-- Fees
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
  year INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade_id, term_number, year)
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES public.pupils(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
  year INTEGER NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============== RLS POLICIES ===============

-- user_roles: only admins can view
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "SuperAdmin full access user_roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'SuperAdmin'));

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- grades: all authenticated can read, admins can manage
CREATE POLICY "Read grades" ON public.grades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage grades" ON public.grades
  FOR ALL USING (public.has_any_role(auth.uid()));

-- parents
CREATE POLICY "Read parents" ON public.parents
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert parents" ON public.parents
  FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update parents" ON public.parents
  FOR UPDATE USING (public.has_any_role(auth.uid()));

CREATE POLICY "Delete parents" ON public.parents
  FOR DELETE USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

-- pupils
CREATE POLICY "Read pupils" ON public.pupils
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert pupils" ON public.pupils
  FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update pupils" ON public.pupils
  FOR UPDATE USING (public.has_any_role(auth.uid()));

CREATE POLICY "Delete pupils" ON public.pupils
  FOR DELETE USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

-- fees
CREATE POLICY "Read fees" ON public.fees
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert fees" ON public.fees
  FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update fees" ON public.fees
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

CREATE POLICY "Delete fees" ON public.fees
  FOR DELETE USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

-- payments
CREATE POLICY "Read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Insert payments" ON public.payments
  FOR INSERT WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Update payments" ON public.payments
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

CREATE POLICY "No hard delete payments" ON public.payments
  FOR DELETE USING (false);

-- audit_logs
CREATE POLICY "Read audit logs" ON public.audit_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Director') OR public.has_role(auth.uid(), 'SuperAdmin')
  );

CREATE POLICY "Insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- =============== AUDIT TRIGGER ===============

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs(action_type, table_name, record_id, performed_by, new_data)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs(action_type, table_name, record_id, performed_by, old_data, new_data)
    VALUES (
      CASE WHEN TG_TABLE_NAME = 'payments' AND NEW.is_deleted = true AND OLD.is_deleted = false THEN 'SOFT_DELETE' ELSE 'UPDATE' END,
      TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_fees AFTER INSERT OR UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Prevent hard delete on payments
CREATE OR REPLACE FUNCTION public.prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete not allowed. Use soft delete.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_payments BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_delete();
