-- =====================================================
-- DISABLE ALL ROW LEVEL SECURITY POLICIES
-- MVP System - No Access Restrictions
-- =====================================================

-- Disable RLS on all tables to fix 401 errors
ALTER TABLE pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE other_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_edit_log DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true;

-- If any tables still show rowsecurity = true, they need individual attention
