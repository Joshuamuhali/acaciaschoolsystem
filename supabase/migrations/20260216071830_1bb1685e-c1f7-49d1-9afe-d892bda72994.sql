
-- Fix function search_path for prevent_payment_delete
CREATE OR REPLACE FUNCTION public.prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete not allowed. Use soft delete.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix overly permissive audit_logs insert policy
DROP POLICY "Insert audit logs" ON public.audit_logs;
CREATE POLICY "Insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
