-- =====================================================
-- DISCOUNT SYSTEM REFACTOR - PUPIL-LEVEL DISCOUNTS
-- =====================================================
-- Migration: From Transaction-Level to Pupil-Level Discounts
-- Author: System Architect
-- Date: 2026-02-26

-- =====================================================
-- 1. NEW PUPIL DISCOUNT TABLE (Recommended Approach)
-- =====================================================

CREATE TABLE pupil_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (
        (discount_type = 'percentage' AND discount_value BETWEEN 0 AND 100) OR
        (discount_type = 'fixed' AND discount_value >= 0)
    ),
    applies_to VARCHAR(20) NOT NULL DEFAULT 'tuition' CHECK (applies_to IN ('tuition', 'transport', 'lunch', 'all')),
    term_id UUID REFERENCES terms(id) ON DELETE SET NULL, -- NULL means applies to all terms
    is_active BOOLEAN DEFAULT true,
    reason VARCHAR(100), -- Scholarship, Staff Child, Sibling Discount, etc.
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active discount per pupil per scope
    UNIQUE(pupil_id, applies_to, term_id, is_active) WHERE is_active = true
);

-- =====================================================
-- 2. ALTERNATIVE: SIMPLER APPROACH (Add to pupils table)
-- =====================================================

-- Uncomment these lines if you prefer the simpler approach:

-- ALTER TABLE pupils ADD COLUMN discount_type VARCHAR(20) NULL CHECK (discount_type IN ('percentage', 'fixed'));
-- ALTER TABLE pupils ADD COLUMN discount_value DECIMAL(10,2) NULL;
-- ALTER TABLE pupils ADD COLUMN discount_applies_to VARCHAR(20) DEFAULT 'tuition' CHECK (discount_applies_to IN ('tuition', 'transport', 'lunch', 'all'));
-- ALTER TABLE pupils ADD COLUMN discount_active BOOLEAN DEFAULT false;

-- =====================================================
-- 3. REMOVE DISCOUNT FROM TRANSACTIONS/INSTALLMENTS
-- =====================================================

-- First, backup existing discount data for migration
CREATE TABLE discount_migration_backup AS
SELECT 
    i.id as installment_id,
    i.pupil_id,
    i.discount_applied,
    i.amount_paid,
    i.date_paid,
    i.fee_type,
    sf.term_id
FROM installments i
LEFT JOIN school_fees sf ON i.school_fee_id = sf.id
WHERE i.discount_applied > 0;

-- Remove discount columns from payment tables
ALTER TABLE installments DROP COLUMN IF EXISTS discount_applied;

-- =====================================================
-- 4. UPDATED FEE CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate pupil's discount for a specific fee type and term
CREATE OR REPLACE FUNCTION get_pupil_discount(
    p_pupil_id UUID,
    p_fee_type VARCHAR(20),
    p_term_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_discount_amount DECIMAL(10,2) := 0;
    v_base_fee DECIMAL(10,2);
    v_discount_record RECORD;
BEGIN
    -- Get the base fee amount
    IF p_fee_type = 'school_fee' THEN
        SELECT total_expected INTO v_base_fee
        FROM school_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSIF p_fee_type = 'other_fee' THEN
        SELECT total_expected INTO v_base_fee
        FROM other_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSE
        RETURN 0;
    END IF;
    
    -- Get applicable discount
    SELECT pd.* INTO v_discount_record
    FROM pupil_discounts pd
    WHERE pd.pupil_id = p_pupil_id
      AND pd.is_active = true
      AND (pd.term_id IS NULL OR pd.term_id = p_term_id)
      AND (pd.applies_to = 'all' OR 
           (pd.applies_to = 'tuition' AND p_fee_type = 'school_fee') OR
           (pd.applies_to = 'transport' AND p_fee_type = 'other_fee') OR
           (pd.applies_to = 'lunch' AND p_fee_type = 'other_fee'))
    ORDER BY 
        CASE WHEN pd.term_id = p_term_id THEN 1 ELSE 2 END, -- Prefer term-specific discounts
        pd.created_at DESC
    LIMIT 1;
    
    -- Calculate discount amount
    IF v_discount_record IS NOT NULL THEN
        IF v_discount_record.discount_type = 'percentage' THEN
            v_discount_amount := v_base_fee * (v_discount_record.discount_value / 100);
        ELSE -- fixed amount
            v_discount_amount := LEAST(v_discount_record.discount_value, v_base_fee);
        END IF;
    END IF;
    
    RETURN COALESCE(v_discount_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate net fee after discount
CREATE OR REPLACE FUNCTION calculate_net_fee(
    p_pupil_id UUID,
    p_fee_type VARCHAR(20),
    p_term_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_fee DECIMAL(10,2);
    v_discount DECIMAL(10,2);
BEGIN
    -- Get base fee
    IF p_fee_type = 'school_fee' THEN
        SELECT total_expected INTO v_base_fee
        FROM school_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSIF p_fee_type = 'other_fee' THEN
        SELECT total_expected INTO v_base_fee
        FROM other_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSE
        RETURN 0;
    END IF;
    
    -- Get discount
    v_discount := get_pupil_discount(p_pupil_id, p_fee_type, p_term_id);
    
    RETURN COALESCE(v_base_fee, 0) - COALESCE(v_discount, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. UPDATED VIEWS FOR REPORTING
-- =====================================================

-- Updated dashboard stats view
CREATE OR REPLACE VIEW dashboard_stats AS
WITH school_fees_summary AS (
  SELECT
    COUNT(DISTINCT sf.pupil_id) AS total_pupils,
    COUNT(DISTINCT CASE WHEN p.status = 'admitted' THEN sf.pupil_id END) AS admitted_pupils,
    COUNT(DISTINCT CASE WHEN p.status = 'new' THEN sf.pupil_id END) AS new_pupils,
    COALESCE(SUM(sf.total_expected), 0) AS school_fees_expected,
    COALESCE(SUM(sf.total_collected), 0) AS school_fees_collected,
    COALESCE(SUM(sf.balance), 0) AS school_fees_outstanding
  FROM school_fees sf
  LEFT JOIN pupils p ON sf.pupil_id = p.id
),
other_fees_summary AS (
  SELECT
    COALESCE(SUM(of.total_expected), 0) AS other_fees_expected,
    COALESCE(SUM(of.collected), 0) AS other_fees_collected,
    COALESCE(SUM(of.balance), 0) AS other_fees_outstanding
  FROM other_fees of
),
discount_summary AS (
  SELECT
    COUNT(DISTINCT pd.pupil_id) AS pupils_with_discounts,
    COUNT(pd.id) AS total_discounts,
    COALESCE(SUM(
      CASE 
        WHEN pd.discount_type = 'percentage' THEN 
          (CASE 
            WHEN pd.applies_to = 'all' THEN 
              (SELECT COALESCE(SUM(sf.total_expected + of.total_expected), 0)
               FROM school_fees sf 
               LEFT JOIN other_fees of ON sf.pupil_id = of.pupil_id AND sf.term_id = of.term_id
               WHERE sf.pupil_id = pd.pupil_id AND (pd.term_id IS NULL OR sf.term_id = pd.term_id))
            WHEN pd.applies_to = 'tuition' THEN 
              (SELECT COALESCE(SUM(sf.total_expected), 0)
               FROM school_fees sf
               WHERE sf.pupil_id = pd.pupil_id AND (pd.term_id IS NULL OR sf.term_id = pd.term_id))
            ELSE 0
          END) * (pd.discount_value / 100)
        ELSE -- fixed amount
          pd.discount_value
      END
    ), 0) AS total_discount_amount
  FROM pupil_discounts pd
  WHERE pd.is_active = true
)
SELECT
    sfs.total_pupils,
    sfs.admitted_pupils,
    sfs.new_pupils,
    sfs.school_fees_expected,
    sfs.school_fees_collected,
    sfs.school_fees_outstanding,
    ofs.other_fees_expected,
    ofs.other_fees_collected,
    ofs.other_fees_outstanding,
    (sfs.school_fees_expected + ofs.other_fees_expected) AS total_expected,
    (sfs.school_fees_collected + ofs.other_fees_collected) AS total_collected,
    (sfs.school_fees_outstanding + ofs.other_fees_outstanding) AS total_outstanding,
    ds.pupils_with_discounts,
    ds.total_discounts,
    ds.total_discount_amount,
    (sfs.school_fees_expected + ofs.other_fees_expected - ds.total_discount_amount) AS net_expected_revenue
FROM school_fees_summary sfs
CROSS JOIN other_fees_summary ofs
CROSS JOIN discount_summary ds;

-- =====================================================
-- 6. MIGRATION SCRIPT
-- =====================================================

-- Function to migrate existing discounts to pupil-level
CREATE OR REPLACE FUNCTION migrate_discounts_to_pupil_level() RETURNS VOID AS $$
DECLARE
    migration_record RECORD;
    v_pupil_id UUID;
    v_term_id UUID;
    v_discount_percentage DECIMAL(5,2);
BEGIN
    -- For each unique pupil/term combination with discounts
    FOR migration_record IN 
        SELECT DISTINCT 
            i.pupil_id,
            sf.term_id,
            MAX(i.discount_applied) as discount_percentage -- Use the highest discount applied
        FROM discount_migration_backup i
        LEFT JOIN school_fees sf ON i.school_fee_id = sf.id
        WHERE i.discount_applied > 0
        GROUP BY i.pupil_id, sf.term_id
    LOOP
        -- Insert pupil-level discount
        INSERT INTO pupil_discounts (
            pupil_id,
            discount_type,
            discount_value,
            applies_to,
            term_id,
            is_active,
            reason,
            created_by,
            created_at
        ) VALUES (
            migration_record.pupil_id,
            'percentage',
            migration_record.discount_percentage,
            'tuition', -- Default to tuition for existing discounts
            migration_record.term_id,
            true,
            'Migrated from installment discount',
            'system_migration',
            NOW()
        );
    END LOOP;
    
    -- Log migration completion
    INSERT INTO payment_log (
        function_name,
        parameters,
        created_at
    ) VALUES (
        'migrate_discounts_to_pupil_level',
        json_build_object('status', 'completed', 'timestamp', NOW()),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. UPDATED PAYMENT RECORDING FUNCTION
-- =====================================================

-- Updated payment recording function (no discount parameter)
CREATE OR REPLACE FUNCTION record_payment(
    p_pupil_id UUID,
    p_school_fee_id UUID DEFAULT NULL,
    p_other_fee_id UUID DEFAULT NULL,
    p_amount DECIMAL(10,2),
    p_rct_no VARCHAR(100) DEFAULT NULL,
    p_installment_no INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
    v_fee_type VARCHAR(20);
    v_pupil_discount DECIMAL(10,2);
    v_net_fee DECIMAL(10,2);
    v_balance_remaining DECIMAL(10,2);
    v_installment_id UUID;
    v_term_id UUID;
BEGIN
    -- Determine fee type and get term
    IF p_school_fee_id IS NOT NULL THEN
        v_fee_type := 'school_fee';
        SELECT term_id INTO v_term_id FROM school_fees WHERE id = p_school_fee_id;
    ELSIF p_other_fee_id IS NOT NULL THEN
        v_fee_type := 'other_fee';
        SELECT term_id INTO v_term_id FROM other_fees WHERE id = p_other_fee_id;
    ELSE
        RAISE EXCEPTION 'Either school_fee_id or other_fee_id must be provided';
    END IF;
    
    -- Calculate net fee (base fee - pupil discount)
    v_net_fee := calculate_net_fee(p_pupil_id, v_fee_type, v_term_id);
    
    -- Calculate remaining balance
    v_balance_remaining := v_net_fee - p_amount;
    
    -- Record installment (no discount applied)
    INSERT INTO installments (
        pupil_id,
        fee_type,
        school_fee_id,
        other_fee_id,
        installment_no,
        amount_paid,
        balance_remaining,
        RCT_no,
        date_paid
    ) VALUES (
        p_pupil_id,
        v_fee_type,
        p_school_fee_id,
        p_other_fee_id,
        p_installment_no,
        p_amount,
        v_balance_remaining,
        p_rct_no,
        NOW()
    ) RETURNING id INTO v_installment_id;
    
    -- Update fee tables
    IF p_school_fee_id IS NOT NULL THEN
        UPDATE school_fees 
        SET total_collected = total_collected + p_amount,
            balance = balance - p_amount
        WHERE id = p_school_fee_id;
    ELSIF p_other_fee_id IS NOT NULL THEN
        UPDATE other_fees 
        SET collected = collected + p_amount,
            balance = balance - p_amount
        WHERE id = p_other_fee_id;
    END IF;
    
    RETURN v_installment_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Trigger to automatically update fee totals when pupil discount changes
CREATE OR REPLACE FUNCTION update_fees_on_discount_change() RETURNS TRIGGER AS $$
BEGIN
    -- Update all affected school fees
    UPDATE school_fees sf
    SET 
        total_expected = g.base_fee - get_pupil_discount(sf.pupil_id, 'school_fee', sf.term_id),
        balance = (g.base_fee - get_pupil_discount(sf.pupil_id, 'school_fee', sf.term_id)) - sf.total_collected
    FROM (
        SELECT pupil_id, term_id, 2400 as base_fee -- Default base fee, adjust as needed
        FROM grades
        WHERE id = (SELECT grade_id FROM pupils WHERE id = NEW.pupil_id)
    ) g
    WHERE sf.pupil_id = NEW.pupil_id 
      AND (NEW.term_id IS NULL OR sf.term_id = NEW.term_id);
    
    -- Update other fees similarly
    UPDATE other_fees of
    SET 
        total_expected = of.base_fee - get_pupil_discount(of.pupil_id, 'other_fee', of.term_id),
        balance = (of.base_fee - get_pupil_discount(of.pupil_id, 'other_fee', of.term_id)) - of.collected
    WHERE of.pupil_id = NEW.pupil_id 
      AND (NEW.term_id IS NULL OR of.term_id = NEW.term_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fees_on_discount_change
    AFTER INSERT OR UPDATE OR DELETE ON pupil_discounts
    FOR EACH ROW EXECUTE FUNCTION update_fees_on_discount_change();

-- =====================================================
-- 9. SAMPLE DATA FOR TESTING
-- =====================================================

-- Example: Add a 10% discount for a pupil
-- INSERT INTO pupil_discounts (
--     pupil_id,
--     discount_type,
--     discount_value,
--     applies_to,
--     term_id,
--     is_active,
--     reason,
--     created_by
-- ) VALUES (
--     'pupil-uuid-here',
--     'percentage',
--     10.00,
--     'tuition',
--     NULL, -- Applies to all terms
--     true,
--     'Staff Child Discount',
--     'admin'
-- );

-- =====================================================
-- 10. VALIDATION RULES
-- =====================================================

-- Ensure discounts don't create negative balances
ALTER TABLE school_fees ADD CONSTRAINT positive_balance_after_discount 
CHECK (total_expected >= 0 AND balance >= 0);

ALTER TABLE other_fees ADD CONSTRAINT positive_balance_after_discount 
CHECK (total_expected >= 0 AND balance >= 0);

-- =====================================================
-- MIGRATION INSTRUCTIONS
-- =====================================================

-- To execute the migration:
-- 1. Run this SQL file to create the new structure
-- 2. Execute: SELECT migrate_discounts_to_pupil_level();
-- 3. Verify: SELECT * FROM pupil_discounts WHERE is_active = true;
-- 4. Update application code to use new discount logic
-- 5. Remove old discount UI from payment forms
-- 6. Add discount management to pupil profile/edit pages
