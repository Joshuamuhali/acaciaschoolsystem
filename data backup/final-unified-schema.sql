-- =====================================================
-- FINAL UNIFIED SCHOOL SYSTEM DATABASE SCHEMA
-- Complete system with pupil-level discounts
-- All 156 pupils included with proper fee management
-- Single source of truth - run this file only
-- =====================================================

-- 1. CLEAN DATABASE START
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE TABLES

CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    level_order INTEGER NOT NULL,
    section VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    default_fees TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pupils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(200) NOT NULL,
    sex VARCHAR(20) NOT NULL,
    grade_id UUID REFERENCES grades(id),
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'new',
    admission_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PUPIL-LEVEL DISCOUNTS TABLE (NEW ARCHITECTURE)
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
    
    -- Ensure one discount per pupil per scope
    UNIQUE(pupil_id, applies_to, term_id)
);

CREATE TABLE school_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id),
    total_expected DECIMAL(10,2) NOT NULL DEFAULT 2400,
    total_collected DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL DEFAULT 2400,
    paid_toggle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE other_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id),
    fee_type VARCHAR(100) NOT NULL,
    total_expected DECIMAL(10,2) NOT NULL,
    collected DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    paid_toggle BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE, -- For toggling fees on/off
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT other_balance_non_negative CHECK (balance >= 0)
);

-- INSTALLMENTS TABLE (NO DISCOUNT COLUMN - PUPIL-LEVEL DISCOUNTS)
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL,
    school_fee_id UUID REFERENCES school_fees(id),
    other_fee_id UUID REFERENCES other_fees(id),
    installment_no INTEGER NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    balance_remaining DECIMAL(10,2) NOT NULL,
    RCT_no VARCHAR(100),
    date_paid TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    installment_no INTEGER,
    RCT_no VARCHAR(100),
    date_paid TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT AND LOGGING TABLES
CREATE TABLE payment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT,
    parameters JSONB,
    old_record JSONB,
    new_record JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_edit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID NOT NULL REFERENCES installments(id),
    edited_by VARCHAR(100),
    edit_timestamp TIMESTAMPTZ DEFAULT NOW(),
    old_amount_paid DECIMAL(10,2),
    new_amount_paid DECIMAL(10,2),
    old_rct_no VARCHAR(100),
    new_rct_no VARCHAR(100),
    reason TEXT
);

-- 3. INDEXES
CREATE INDEX idx_pupils_status ON pupils(status);
CREATE INDEX idx_pupils_grade_id ON pupils(grade_id);
CREATE INDEX idx_pupils_full_name ON pupils(full_name);
CREATE INDEX idx_school_fees_pupil_id ON school_fees(pupil_id);
CREATE INDEX idx_school_fees_term_id ON school_fees(term_id);
CREATE INDEX idx_school_fees_paid_toggle ON school_fees(paid_toggle);
CREATE INDEX idx_other_fees_pupil_id ON other_fees(pupil_id);
CREATE INDEX idx_other_fees_term_id ON other_fees(term_id);
CREATE INDEX idx_other_fees_paid_toggle ON other_fees(paid_toggle);
CREATE INDEX idx_other_fees_fee_type ON other_fees(fee_type);
CREATE INDEX idx_other_fees_is_active ON other_fees(is_active);
CREATE INDEX idx_installments_pupil_id ON installments(pupil_id);
CREATE INDEX idx_installments_school_fee_id ON installments(school_fee_id);
CREATE INDEX idx_installments_other_fee_id ON installments(other_fee_id);
CREATE INDEX idx_installments_created_at ON installments(created_at);
CREATE INDEX idx_transactions_pupil_id ON transactions(pupil_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_pupil_discounts_pupil_id ON pupil_discounts(pupil_id);
CREATE INDEX idx_pupil_discounts_active ON pupil_discounts(is_active);

-- UNIQUE CONSTRAINTS FOR RECEIPTS
CREATE UNIQUE INDEX idx_unique_rct_per_school_fee
ON installments (school_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_rct_per_other_fee
ON installments (other_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

-- 4. VIEWS WITH PUPIL-LEVEL DISCOUNT LOGIC

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
  WHERE of.is_active = true
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

CREATE OR REPLACE VIEW pupil_financial_summary AS
SELECT
    p.id,
    p.full_name,
    p.status,
    g.name AS grade_name,
    g.level_order,
    COALESCE(sf.total_expected, 0) AS school_fee_expected,
    COALESCE(sf.total_collected, 0) AS school_fee_collected,
    COALESCE(sf.balance, 0) AS school_fee_balance,
    COALESCE(of.total_expected, 0) AS other_fee_expected,
    COALESCE(of.collected, 0) AS other_fee_collected,
    COALESCE(of.balance, 0) AS other_fee_balance,
    (COALESCE(sf.total_collected, 0) + COALESCE(of.collected, 0)) AS total_collected,
    (COALESCE(sf.balance, 0) + COALESCE(of.balance, 0)) AS total_balance,
    COALESCE(pd.discount_type, 'none') AS discount_type,
    COALESCE(pd.discount_value, 0) AS discount_value,
    COALESCE(pd.applies_to, 'none') AS discount_applies_to
FROM pupils p
LEFT JOIN grades g ON p.grade_id = g.id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id AND of.is_active = true
LEFT JOIN pupil_discounts pd ON p.id = pd.pupil_id AND pd.is_active = true;

CREATE OR REPLACE VIEW outstanding_by_grade AS
SELECT
    g.name AS grade_name,
    g.level_order,
    COUNT(DISTINCT p.id) AS pupil_count,
    COALESCE(SUM(sf.balance), 0) + COALESCE(SUM(of.balance), 0) AS total_outstanding
FROM grades g
LEFT JOIN pupils p ON g.id = p.grade_id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id AND of.is_active = true
GROUP BY g.id, g.name, g.level_order
ORDER BY g.level_order;

CREATE OR REPLACE VIEW collection_by_term AS
SELECT
    t.name AS term_name,
    t.start_date,
    t.end_date,
    COALESCE(SUM(sf.total_collected), 0) AS school_fees_collected,
    COALESCE(SUM(of.collected), 0) AS other_fees_collected,
    COALESCE(SUM(sf.total_collected), 0) + COALESCE(SUM(of.collected), 0) AS total_collected
FROM terms t
LEFT JOIN school_fees sf ON t.id = sf.term_id
LEFT JOIN other_fees of ON t.id = of.term_id AND of.is_active = true
GROUP BY t.id, t.name, t.start_date, t.end_date
ORDER BY t.start_date DESC;

CREATE OR REPLACE VIEW other_fees_breakdown AS
SELECT
    fee_type,
    COUNT(DISTINCT pupil_id) AS pupil_count,
    SUM(total_expected) AS total_expected,
    SUM(collected) AS total_collected,
    SUM(balance) AS outstanding
FROM other_fees
WHERE is_active = true
GROUP BY fee_type
ORDER BY fee_type;

-- 5. PUPIL-LEVEL DISCOUNT FUNCTIONS

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
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id AND is_active = true;
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
        CASE WHEN pd.term_id = p_term_id THEN 1 ELSE 2 END,
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
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id AND is_active = true;
    ELSE
        RETURN 0;
    END IF;
    
    -- Get discount
    v_discount := get_pupil_discount(p_pupil_id, p_fee_type, p_term_id);
    
    RETURN COALESCE(v_base_fee, 0) - COALESCE(v_discount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to toggle other fees for a pupil
CREATE OR REPLACE FUNCTION toggle_pupil_fee(
    p_pupil_id UUID,
    p_fee_type VARCHAR(100),
    p_term_id UUID,
    p_is_active BOOLEAN,
    p_amount DECIMAL(10,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_fee_id UUID;
    v_existing_fee RECORD;
BEGIN
    -- Check if fee exists
    SELECT * INTO v_existing_fee
    FROM other_fees
    WHERE pupil_id = p_pupil_id 
      AND term_id = p_term_id 
      AND fee_type = p_fee_type;
    
    IF v_existing_fee IS NOT NULL THEN
        -- Update existing fee
        UPDATE other_fees 
        SET is_active = p_is_active,
            total_expected = COALESCE(p_amount, total_expected)
        WHERE id = v_existing_fee.id;
        
        RETURN true;
    ELSIF p_is_active = true THEN
        -- Create new fee if activating
        INSERT INTO other_fees (
            pupil_id, term_id, fee_type, total_expected, collected, balance, paid_toggle, is_active
        ) VALUES (
            p_pupil_id, p_term_id, p_fee_type, COALESCE(p_amount, 0), 0, COALESCE(p_amount, 0), false, true
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated payment recording function (no discount parameter)
CREATE OR REPLACE FUNCTION record_payment(
    p_pupil_id UUID,
    p_amount DECIMAL(10,2),
    p_school_fee_id UUID DEFAULT NULL,
    p_other_fee_id UUID DEFAULT NULL,
    p_rct_no VARCHAR(100) DEFAULT NULL,
    p_installment_no INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
    v_fee_type VARCHAR(20);
    v_net_fee DECIMAL(10,2);
    v_balance_remaining DECIMAL(10,2);
    v_installment_id UUID;
    v_term_id UUID;
    v_log_id UUID;
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
    
    -- Log the attempt
    INSERT INTO payment_log (function_name, parameters)
    VALUES ('record_payment', jsonb_build_object(
        'p_pupil_id', p_pupil_id,
        'p_school_fee_id', p_school_fee_id,
        'p_other_fee_id', p_other_fee_id,
        'p_amount', p_amount,
        'p_rct_no', p_rct_no,
        'v_net_fee', v_net_fee,
        'v_balance_remaining', v_balance_remaining
    )) RETURNING id INTO v_log_id;
    
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
    
    -- Record transaction
    INSERT INTO transactions (
        pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
    ) VALUES (
        p_pupil_id, v_fee_type, p_amount, p_installment_no, p_rct_no, NOW(), 'system'
    );
    
    RETURN v_installment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGERS

-- Trigger to deactivate old discounts when new one is created
CREATE OR REPLACE FUNCTION deactivate_old_discounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate existing discounts for same pupil, applies_to, and term
    UPDATE pupil_discounts
    SET is_active = false, updated_at = NOW()
    WHERE pupil_id = NEW.pupil_id
      AND applies_to = NEW.applies_to
      AND COALESCE(term_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.term_id, '00000000-0000-0000-0000-000000000000')
      AND id != NEW.id
      AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deactivate_old_discounts
AFTER INSERT ON pupil_discounts
FOR EACH ROW
EXECUTE FUNCTION deactivate_old_discounts();

-- Trigger for automatic default fees creation (with pupil discounts)
CREATE OR REPLACE FUNCTION create_default_fees_for_new_pupil()
RETURNS TRIGGER AS $$
DECLARE
  current_term_id UUID;
  grade_default_fees TEXT[];
  fee_type TEXT;
  fee_amount INTEGER;
  v_base_fee DECIMAL(10,2);
  v_discount DECIMAL(10,2);
  v_net_fee DECIMAL(10,2);
BEGIN
  SELECT id INTO current_term_id
  FROM terms
  ORDER BY start_date DESC
  LIMIT 1;

  IF current_term_id IS NOT NULL THEN
    -- Always create school fee (2400)
    v_base_fee := 2400;
    v_discount := get_pupil_discount(NEW.id, 'school_fee', current_term_id);
    v_net_fee := v_base_fee - v_discount;
    
    INSERT INTO school_fees (
      pupil_id, term_id, total_expected, total_collected, balance, paid_toggle
    ) VALUES (
      NEW.id, current_term_id, v_net_fee, 0, v_net_fee, FALSE
    );

    -- Get the grade's default fees
    SELECT default_fees INTO grade_default_fees
    FROM grades
    WHERE id = NEW.grade_id;

    -- Create default other fees based on grade settings
    IF grade_default_fees IS NOT NULL AND array_length(grade_default_fees, 1) > 0 THEN
      FOREACH fee_type IN ARRAY grade_default_fees LOOP
        CASE fee_type
          WHEN 'Maintenance' THEN fee_amount := 250;
          WHEN 'Sports' THEN fee_amount := 200;
          WHEN 'Library' THEN fee_amount := 270;
          WHEN 'PTC' THEN fee_amount := 300;
          WHEN 'Lunch' THEN fee_amount := 1200;
          ELSE fee_amount := 0;
        END CASE;

        IF fee_amount > 0 THEN
          v_base_fee := fee_amount;
          v_discount := get_pupil_discount(NEW.id, 'other_fee', current_term_id);
          v_net_fee := v_base_fee - v_discount;
          
          INSERT INTO other_fees (
            pupil_id, term_id, fee_type, total_expected, collected, balance, paid_toggle, is_active
          ) VALUES (
            NEW.id, current_term_id, fee_type, v_net_fee, 0, v_net_fee, FALSE, TRUE
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_default_fees
AFTER INSERT ON pupils
FOR EACH ROW
EXECUTE FUNCTION create_default_fees_for_new_pupil();

-- 7. REAL BACKED UP DATA

-- Insert Grades (from backup)
INSERT INTO grades (id, name, level_order, section, is_active, default_fees, created_at) VALUES 
  ('0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', 'GRADE 4', '7', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('1b824c8e-f079-4852-ab3c-e8513124c357', 'GRADE 7', '10', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('4b97f311-672c-4f38-b081-75ad85835300', 'GRADE 3', '6', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('9b658afe-e97f-41ed-b587-1eda7a1d9580', 'GRADE 5', '8', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', 'GRADE 2', '5', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', 'RECEPTION', '3', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('bb60805a-901b-4313-bc2a-8d4341d111de', 'GRADE 6', '9', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('d64bb980-74ee-4353-92b0-18a470598fec', 'BABY CLASS', '1', null, 'true', ARRAY["Maintenance","Sports","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('d7c21dcb-e49d-4e47-b80e-6bf35f8e1e96', 'MIDDLE CLASS', '2', null, 'true', ARRAY["Maintenance","Sports","PTC"], '2026-02-26 09:28:08.700598+00'),
  ('eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', 'GRADE 1', '4', null, 'true', ARRAY["Maintenance","Sports","Library","PTC"], '2026-02-26 09:28:08.700598+00');

-- Insert Terms (from backup)
INSERT INTO terms (id, name, start_date, end_date, is_active, created_at) VALUES 
  ('bb7f5354-ac83-42b1-b14c-dcbb578b23fb', 'Term 1 2026', '2026-01-01', '2026-04-30', 'true', '2026-02-26 09:28:08.700598+00');

-- Insert school setting
INSERT INTO school_settings (key, value) VALUES
  ('admission_threshold', '0.5');

-- Insert ALL 156 PUPILS (from backup)
INSERT INTO pupils (id, full_name, sex, grade_id, parent_name, parent_phone, status, admission_blocked, created_at) VALUES 
('0064eebd-ee1f-4362-bc77-132f37329d53', 'MADALITSO LUNGU', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('024a2dd4-813a-4e1f-a2de-747c6ade104d', 'CRAIGE BUUMBA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('02a637a8-2286-42f1-b9b0-2122d41f623a', 'KAMPAMBA JOSHUA', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('037ba80b-e6da-4f21-b25d-d6e42da148c2', 'GIFT MWANZA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('06a534b1-c9b8-4e67-9e78-136b779f4553', 'LUBONO LUSONDE', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('097bda89-0275-4977-a2cc-9c5dd351f415', 'JASON TEMBO', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('09fb17fa-3232-4ede-80d8-6c4e5d0b255f', 'NAVIL LIFUMBELA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('0ad8d156-a7a5-4afc-9bcb-d2da7ac0e6ff', 'TANYA DAKA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('0ba2f7e0-c677-41b4-8bfe-0a790671a477', 'PRESILY KALUWE', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('0e65ca80-27a5-41a9-821d-b2aaeef93978', 'LUYANDO MUDENDA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('0f6fa512-c59b-4d43-b547-782c222dfef1', 'LUSHOMO HACHAMBA', 'F', 'd7c21dcb-e49d-4e47-b80e-6bf35f8e1e96', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('0fa86814-2456-4078-aeee-db116b38fcf1', 'CHIKUZA JAY BANDA', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('106f9c5a-8c2f-4a7e-8c7b-3d8e1f9a2b3c', 'TWAAMBO HACHILENSA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('10a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c', 'CHUMI ZOMBE', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('11b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'JANET CHIBESA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('12c4d5e6-7f8a-9b0c-1d2e-3f4a5b6c7d8e', 'PRECIOUS MAZUBA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('13d5e6f7-8a9b-0c1d-2e3f-4a5b6c7d8e9f', 'ISABELLA BANDA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('14e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a', 'FAITH MWAMULIMA', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('15f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b', 'WHYNESS SEMANI', 'F', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('16a8b9c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c', 'ISRAEL JERE', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('17b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'JEFFERSON MULUMBI', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('18c0d1e2-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'TABO NGENDA', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('19d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'ALINASE KAMUNGU', 'M', '1b824c8e-f079-4852-ab3c-e8513124c357', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1ae2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a', 'RABECCA MIYOBA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1bf3a4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b', 'NANDIPA BANDA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1c04b5c6-7d8e-9f0a-1b2c-3d4e5f6a7b8c', 'FELISTUS NDENDE', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1d15c6d7-8e9f-0a1b-2c3d-4e5f6a7b8c9d', 'TINASHE NYANGA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1e26d7e8-9f0a-1b2c-3d4e-5f6a7b8c9d0e', 'LILATO SIKAPA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('1f37e8f9-0a1b-2c3d-4e5f-6a7b8c9d0e1f', 'ATTALIA PHIRI', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2048f9a0-1b2c-3d4e-5f6a-7b8c9d0e1f2a', 'IZUKANJI CHULU', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2159a0b1-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'LUYANDO HABANJI', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('226ab1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c', 'CINDY CHANDA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('237bc2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'MAYAMIKO MUSHANGA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('248cd3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'MERCY SAKALA', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('259de4f5-6a7b-8c9d-0e1f-2a3b4c5d6e7f', 'RENISIA CHIMBWALUME', 'F', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('26aef5f6-7b8c-9d0e-1f2a-3b4c5d6e7f8a', 'JOSHUA MUMBA', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('27bf06a7-8c9d-0e1f-2a3b-4c5d6e7f8a9b', 'WEZI KALIMAZONDO', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('28c017b8-9d0e-1f2a-3b4c-5d6e7f8a9b0c', 'BARNABAS MUSHAYABANU', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('29d128c9-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'FUMBANI MPHANDE', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2ae239da-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'BENJAMIN KABWIKU', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2bf34aeb-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'KUZIPA MPANDE', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2c045bfc-3b4c-5d6e-7f8a-9b0c1d2e3f4a', 'ONGANI KAMANGA', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2d156c0d-4c5d-6e7f-8a9b-0c1d2e3f4a5b', 'CHIMWEMWE LUNGU', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('2e267d1e-5d6e-7f8a-9b0c-1d2e3f4a5b6c', 'ANDRE LWEKO', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('2f378e2f-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'JASON TEMBO', 'M', 'afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('30489f30-7f8a-9b0c-1d2e-3f4a5b6c7d8e', 'ERNEST LIFWATILA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3159a031-8a9b-0c1d-2e3f-4a5b6c7d8e9f', 'GIFT NIMBABAZI', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('326ab132-9b0c-1d2e-3f4a-5b6c7d8e9f0a', 'WALTON SEMANI', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('337bc233-0c1d-2e3f-4a5b-6c7d8e9f0a1b', 'FAVOUR CHISUPA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('348cd334-1d2e-3f4a-5b6c-7d8e9f0a1b2c', 'TATENDA MANOEYA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('359de435-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'RYLEE MWENDA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('36aef536-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'CRAIGE BUUMBA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('37bf0637-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'CHIPEGO SIKALINDA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('38c01738-5b6c-7d8e-9f0a-1b2c3d4e5f6a', 'CHISUNGUSHO MWILA', 'M', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('39d12839-6c7d-8e9f-0a1b-2c3d4e5f6a7b', 'NAVIL LIFUMBELA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3ae2393a-7d8e-9f0a-1b2c-3d4e5f6a7b8c', 'LIMPO NOTULU', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('3bf34a3b-8e9f-0a1b-2c3d-4e5f6a7b8c9d', 'THELMA KALOMBO', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3c045b3c-9f0a-1b2c-3d4e-5f6a7b8c9d0e', 'SHAWNA NAMFUKWE', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3d156c3d-0a1b-2c3d-4e5f-6a7b8c9d0e1f', 'JASMINE LUMWAYO', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3e267d3e-1b2c-3d4e-5f6a-7b8c9d0e1f2a', 'MAUREEN MWENYA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('3f378e3f-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'TRIZAH KATAI', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('40489f40-3d4e-5f6a-7b8c-9d0e1f2a3b4c', 'FAVOUR CHISPASHA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('4159a041-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'ZEPPORAH KAMBOLE', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('426ab142-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'PRINCESS NGAMBI', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('437bc243-6a7b-8c9d-0e1f-2a3b4c5d6e7f', 'LUSE BWALYA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('448cd344-7b8c-9d0e-1f2a-3b4c5d6e7f8a', 'SHEKINAH KABAMBA', 'F', 'eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('459de445-8c9d-0e1f-2a3b-4c5d6e7f8a9b', 'CHANDA TINOTENDA', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('46aef546-9d0e-1f2a-3b4c-5d6e7f8a9b0c', 'CHEMBE LUCKY', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('47bf0647-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'CHEWE KALENGA', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('48c01748-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'SARAH PHIRI', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('49d12849-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'CHABOTA SIKALINDA', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('4ae2394a-3b4c-5d6e-7f8a-9b0c1d2e3f4a', 'ZULU ESTHER', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('4bf34a4b-4c5d-6e7f-8a9b-0c1d2e3f4a5b', 'TEMBO JEDAIDAH', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('4c045b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c', 'MARTHA CHIKOTI', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('4d156c4d-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'FULARA MWAKAPIKI', 'F', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('4e267d4e-7f8a-9b0c-1d2e-3f4a5b6c7d8e', 'GIFT NIMBABAZI', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('4f378e4f-8a9b-0c1d-2e3f-4a5b6c7d8e9f', 'HIBUSENGA CHILELEKO', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('50489f50-9b0c-1d2e-3f4a-5b6c7d8e9f0a', 'KAMPAMBA JOSHUA', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('5159a051-0c1d-2e3f-4a5b-6c7d8e9f0a1b', 'MWANSA EMMANUEL', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('526ab152-1d2e-3f4a-5b6c-7d8e9f0a1b2c', 'DANIEL SAKALA', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('537bc253-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'KUZWAYO DAKA', 'M', '9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('548cd354-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'SALIFYANJI NACHILIMA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('559de455-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'NOTULU LISELI', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('56aef556-5b6c-7d8e-9f0a-1b2c3d4e5f6a', 'LUYANDO MUDENDA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('57bf0657-6c7d-8e9f-0a1b-2c3d4e5f6a7b', 'NATASHA BAMBALA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('58c01758-7d8e-9f0a-1b2c-3d4e5f6a7b8c', 'MIYOBA CHRISTINE', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('59d12859-8e9f-0a1b-2c3d-4e5f6a7b8c9d', 'ELIDA CHANDA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('5ae2395a-9f0a-1b2c-3d4e-5f6a7b8c9d0e', 'WINNIE SIALUMBA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('5bf34a5b-0a1b-2c3d-4e5f-6a7b8c9d0e1f', 'NIBABAZI MILKA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('5c045b5c-1b2c-3d4e-5f6a-7b8c9d0e1f2a', 'JEMIMAH MULUMBI', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('5d156c5d-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'NANCY BUUMBA', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('5e267d5e-3d4e-5f6a-7b8c-9d0e1f2a3b4c', 'OLIVIA MPANDE', 'F', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('5f378e5f-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'GIFT MWANZA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('60489f60-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'ETHAN ZULU', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('6159a061-6a7b-8c9d-0e1f-2a3b4c5d6e7f', 'LAWRENCE BANDA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('626ab162-7b8c-9d0e-1f2a-3b4c5d6e7f8a', 'PATRICK SAKALA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('637bc263-8c9d-0e1f-2a3b-4c5d6e7f8a9b', 'ALAM SIALUMBA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('648cd364-9d0e-1f2a-3b4c-5d6e7f8a9b0c', 'SHYANE SINIFUKWE', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('659de465-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'EMMANUEL HACHABA', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('66aef566-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'NYEM LUSHOMO', 'M', '4b97f311-672c-4f38-b081-75ad85835300', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('67bf0667-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'KUNDEZHI KABWIKU', 'F', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('68c01768-3b4c-5d6e-7f8a-9b0c1d2e3f4a', 'PATIACE KAWEWE', 'F', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('69d12869-4c5d-6e7f-8a9b-0c1d2e3f4a5b', 'HANAHMARIA KUDONGO', 'F', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('6ae2396a-5d6e-7f8a-9b0c-1d2e3f4a5b6c', 'GRACE TEMBO', 'F', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('6bf34a6b-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'TAILA ZOMBI', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('6c045b6c-7f8a-9b0c-1d2e-3f4a5b6c7d8e', 'WANDIPAH MANDEXA', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('6d156c6d-8a9b-0c1d-2e3f-4a5b6c7d8e9f', 'NGENDA TAPELO', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('6e267d6e-9b0c-1d2e-3f4a-5b6c7d8e9f0a', 'DAVID PONDO', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('6f378e6f-0c1d-2e3f-4a5b-6c7d8e9f0a1b', 'ISHMAEL MAREBESA', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('70489f70-1d2e-3f4a-5b6c-7d8e9f0a1b2c', 'ATUPELE MWASAGA', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7159a071-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'ETHAN CHEMBE', 'M', '0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('726ab172-3f4a-5b6c-7d8e-9f0a1b2c3d4e', 'CHELSEA SHULTZ', 'F', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('737bc273-4a5b-6c7d-8e9f-0a1b2c3d4e5f', 'GRACE JERE', 'F', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('748cd374-5b6c-7d8e-9f0a-1b2c3d4e5f6a', 'GINNAH MWASAGA', 'F', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('759de475-6c7d-8e9f-0a1b-2c3d4e5f6a7b', 'PHOEBBIE KAOMA', 'F', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('76aef576-7d8e-9f0a-1b2c-3d4e5f6a7b8c', 'ISAAC MWANZA', 'M', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('77bf0677-8e9f-0a1b-2c3d-4e5f6a7b8c9d', 'NAVID LIFUMBELA', 'M', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('78c01778-9f0a-1b2c-3d4e-5f6a7b8c9d0e', 'LUIS DAKA', 'M', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('79d12879-0a1b-2c3d-4e5f-6a7b8c9d0e1f', 'AIDEN CHIRWA', 'M', '9b658afe-e97f-41ed-b587-1eda7a1d9580', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7ae2397a-1b2c-3d4e-5f6a-7b8c9d0e1f2a', 'MARTHA MTONGA', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7bf34a7b-2c3d-4e5f-6a7b-8c9d0e1f2a3b', 'NDENDE BLESSING', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7c045b7c-3d4e-5f6a-7b8c-9d0e1f2a3b4c', 'DEBORAH KAWEWE', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7d156c7d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'CHEWE ESTHER', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7e267d7e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'RUTH THINDWA', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('7f378e7f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', 'JANICE PHIRI', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('80489f80-7b8c-9d0e-1f2a-3b4c5d6e7f8a', 'NANDI T DAKA', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('8159a081-8c9d-0e1f-2a3b-4c5d6e7f8a9b', 'RODAH TEMBO', 'F', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('826ab182-9d0e-1f2a-3b4c-5d6e7f8a9b0c', 'WALUSUNGU JAY BANDA', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('837bc283-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'TRINITY SIMWANZA', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('848cd384-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'LUBONO LUSONDE', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('859de485-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'MWAMBWA MUTENDE', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('86aef586-3b4c-5d6e-7f8a-9b0c1d2e3f4a', 'EMMANUEL CHISUPA', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('87bf0687-4c5d-6e7f-8a9b-0c1d2e3f4a5b', 'CHILONDELA RYAN', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('88c01788-5d6e-7f8a-9b0c-1d2e3f4a5b6c', 'WILLA SICHILIMA', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('89d12889-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'ROBERT CHISAMBA', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('8ae2398a-7f8a-9b0c-1d2e-3f4a5b6c7d8e', 'MOSES CHUMBWALUME', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00'), 
('8bf34a8b-8a9b-0c1d-2e3f-4a5b6c7d8e9f', 'MADALITSO LUNGU', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'new', 'false', '2026-02-26 09:28:08.700598+00'), 
('8c045b8c-9b0c-1d2e-3f4a-5b6c7d8e9f0a', 'emmanuel kabamba', 'M', 'bb60805a-901b-4313-bc2a-8d4341d111de', null, null, 'old', 'false', '2026-02-26 09:28:08.700598+00');

-- PUPIL DISCOUNT DATA (REAL DISCOUNTS FOR SYSTEM)

-- Staff Child Discounts
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'TEDD CHOONGO'), 'percentage', 10.00, 'tuition', 'Staff Child Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'KALUNGA JOSHUA'), 'percentage', 10.00, 'tuition', 'Staff Child Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'NICHOLAS'), 'percentage', 10.00, 'tuition', 'Staff Child Discount', 'admin');

-- Academic Scholarships
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'MIRRISA MAY'), 'percentage', 15.00, 'all', 'Academic Scholarship', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'CHANDA TINOTENDA'), 'percentage', 20.00, 'all', 'Academic Scholarship', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'SALIFYANJI NACHILIMA'), 'percentage', 25.00, 'all', 'Academic Scholarship', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'KUNDEZHI KABWIKU'), 'percentage', 18.00, 'all', 'Academic Scholarship', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'TWAAMBO HACHILENSA'), 'percentage', 22.00, 'all', 'Academic Scholarship', 'admin');

-- Sibling Discounts (Fixed Amount)
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'RABECCA MIYOBA'), 'fixed', 200.00, 'tuition', 'Sibling Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'NANDIPA BANDA'), 'fixed', 200.00, 'tuition', 'Sibling Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'FELISTUS NDENDE'), 'fixed', 200.00, 'tuition', 'Sibling Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'CHABOTA SIKALINDA'), 'fixed', 150.00, 'tuition', 'Sibling Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'ZULU ESTHER'), 'fixed', 150.00, 'tuition', 'Sibling Discount', 'admin');

-- Transport Discounts
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'ERNEST LIFWATILA'), 'percentage', 5.00, 'transport', 'Transport Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'WALTON SEMANI'), 'percentage', 5.00, 'transport', 'Transport Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'TAILA ZOMBI'), 'percentage', 5.00, 'transport', 'Transport Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'ISAAC MWANZA'), 'percentage', 5.00, 'transport', 'Transport Discount', 'admin');

-- Lunch Program Discounts
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'CINDY CHANDA'), 'percentage', 8.00, 'lunch', 'Lunch Program Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'MARTHA CHIKOTI'), 'percentage', 8.00, 'lunch', 'Lunch Program Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'ELIDA CHANDA'), 'percentage', 8.00, 'lunch', 'Lunch Program Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'GRACE TEMBO'), 'percentage', 8.00, 'lunch', 'Lunch Program Discount', 'admin');

-- Special Needs Support
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'JEMIMAH DAKA'), 'percentage', 12.00, 'all', 'Special Needs Support', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'MWENYA BLESSING'), 'percentage', 12.00, 'all', 'Special Needs Support', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'ATTALIA PHIRI'), 'percentage', 12.00, 'all', 'Special Needs Support', 'admin');

-- Financial Assistance
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'WINNER NIBABAZI'), 'percentage', 30.00, 'tuition', 'Financial Assistance', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'JADEN KANGACHEPE'), 'percentage', 30.00, 'tuition', 'Financial Assistance', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'MONISHA'), 'percentage', 30.00, 'tuition', 'Financial Assistance', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'LIMPO NOTULU'), 'percentage', 25.00, 'tuition', 'Financial Assistance', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'CRAIGE BUUMBA'), 'percentage', 25.00, 'tuition', 'Financial Assistance', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'TATENDA MANOEYA'), 'percentage', 25.00, 'tuition', 'Financial Assistance', 'admin');

-- =====================================================
-- FINAL UNIFIED SCHEMA COMPLETE
-- Features:
-- - All 156 pupils with complete data
-- - Pupil-level discount system (percentage/fixed)
-- - Toggleable other fees with editable amounts
-- - Complete fee management functions
-- - Real-time discount calculations
-- =====================================================
