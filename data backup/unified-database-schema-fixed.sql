-- =====================================================
-- UNIFIED SCHOOL SYSTEM DATABASE WITH PARENT MANAGEMENT
-- Complete schema with all data and business rules
-- =====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. TABLES (IN CORRECT DEPENDENCY ORDER)
-- ------------------------------------------------------------------------

-- School settings (no dependencies)
CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grades (no dependencies)
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    level_order INTEGER NOT NULL,
    section VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    default_fees TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terms (no dependencies)
CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    term_number INTEGER CHECK (term_number IN (1,2,3)),
    months_count INTEGER,  -- e.g., 4 for Term 1, 3 for Terms 2 and 3
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Families (no dependencies)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_name VARCHAR(200) NOT NULL,
    parent_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transport routes (no dependencies)
CREATE TABLE transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(100) NOT NULL,
    monthly_fee DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pupils (depends on grades, families, transport_routes)
CREATE TABLE pupils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(200) NOT NULL,
    sex VARCHAR(20) NOT NULL,
    grade_id UUID REFERENCES grades(id),
    birth_date DATE,
    family_id UUID REFERENCES families(id),
    transport_route_id UUID REFERENCES transport_routes(id),
    takes_lunch BOOLEAN DEFAULT TRUE,
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'new',
    admission_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pupil discounts (depends on pupils, terms)
CREATE TABLE pupil_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (
        (discount_type = 'percentage' AND discount_value BETWEEN 0 AND 100) OR
        (discount_type = 'fixed' AND discount_value >= 0)
    ),
    applies_to VARCHAR(20) NOT NULL DEFAULT 'tuition' CHECK (applies_to IN ('tuition', 'transport', 'lunch', 'all')),
    term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    reason VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pupil_id, applies_to, term_id)
);

-- School fees (depends on pupils, terms)
CREATE TABLE school_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    total_expected DECIMAL(10,2) NOT NULL DEFAULT 2400,
    total_collected DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL DEFAULT 2400,
    paid_toggle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Other fees (depends on pupils, terms)
CREATE TABLE other_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    fee_type VARCHAR(100) NOT NULL,
    total_expected DECIMAL(10,2) NOT NULL,
    collected DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    paid_toggle BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE, -- Toggle to enable/disable fee for pupil
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT other_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT unique_pupil_term_fee UNIQUE(pupil_id, term_id, fee_type)
);

-- Installments (depends on pupils, school_fees, other_fees)
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

-- Transactions (depends on pupils)
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

-- Payment log (no dependencies)
CREATE TABLE payment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT,
    parameters JSONB,
    old_record JSONB,
    new_record JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment edit log (depends on installments)
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

-- =====================================================
-- PARENT SYSTEM SETUP
-- =====================================================

-- Create sequence for parent code
CREATE SEQUENCE parent_code_seq START 1;

-- Function to generate parent code (ACL00001)
CREATE OR REPLACE FUNCTION generate_parent_code()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
BEGIN
    next_number := nextval('parent_code_seq');
    RETURN 'ACL' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Parents table (no dependencies)
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_code VARCHAR(20) NOT NULL UNIQUE DEFAULT generate_parent_code(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    nrc VARCHAR(20),
    address TEXT,
    occupation VARCHAR(255),
    emergency_contact VARCHAR(50),
    relationship_to_pupil VARCHAR(50) DEFAULT 'Parent',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT parents_phone_unique UNIQUE(phone),
    CONSTRAINT parents_relationship_check 
        CHECK (relationship_to_pupil IN ('Parent', 'Guardian', 'Relative', 'Other'))
);

-- Pupil-Parent relationship table (depends on pupils, parents)
CREATE TABLE pupil_parent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'Parent',
    is_primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pupil_parent_unique UNIQUE(pupil_id, parent_id),
    CONSTRAINT relationship_type_check 
        CHECK (relationship_type IN ('Parent', 'Guardian', 'Relative', 'Other'))
);

-- =====================================================
-- 3. INDEXES
-- ------------------------------------------------------------------------

-- Parent table indexes
CREATE UNIQUE INDEX idx_parents_email_unique
ON parents(email)
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX idx_parents_nrc_unique
ON parents(nrc)
WHERE nrc IS NOT NULL;

CREATE INDEX idx_parents_full_name ON parents(full_name);
CREATE INDEX idx_parents_phone ON parents(phone);
CREATE INDEX idx_parents_parent_code ON parents(parent_code);
CREATE INDEX idx_parents_active ON parents(is_active);

-- Relationship table indexes
CREATE INDEX idx_pupil_parent_relationships_pupil_id ON pupil_parent_relationships(pupil_id);
CREATE INDEX idx_pupil_parent_relationships_parent_id ON pupil_parent_relationships(parent_id);
CREATE INDEX idx_pupil_parent_relationships_primary ON pupil_parent_relationships(is_primary_contact);

CREATE UNIQUE INDEX idx_one_primary_contact_per_pupil
ON pupil_parent_relationships(pupil_id)
WHERE is_primary_contact = TRUE;

-- Existing indexes
CREATE INDEX idx_pupils_status ON pupils(status);
CREATE INDEX idx_pupils_grade_id ON pupils(grade_id);
CREATE INDEX idx_pupils_full_name ON pupils(full_name);
CREATE INDEX idx_pupils_family_id ON pupils(family_id);
CREATE INDEX idx_pupils_transport_route_id ON pupils(transport_route_id);
CREATE INDEX idx_families_parent_name ON families(parent_name);

CREATE INDEX idx_school_fees_pupil_id ON school_fees(pupil_id);
CREATE INDEX idx_school_fees_term_id ON school_fees(term_id);
CREATE INDEX idx_school_fees_paid_toggle ON school_fees(paid_toggle);

CREATE INDEX idx_other_fees_pupil_id ON other_fees(pupil_id);
CREATE INDEX idx_other_fees_term_id ON other_fees(term_id);
CREATE INDEX idx_other_fees_paid_toggle ON other_fees(paid_toggle);
CREATE INDEX idx_other_fees_fee_type ON other_fees(fee_type);

CREATE INDEX idx_installments_pupil_id ON installments(pupil_id);
CREATE INDEX idx_installments_school_fee_id ON installments(school_fee_id);
CREATE INDEX idx_installments_other_fee_id ON installments(other_fee_id);
CREATE INDEX idx_installments_created_at ON installments(created_at);

CREATE INDEX idx_transactions_pupil_id ON transactions(pupil_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_pupil_discounts_pupil_id ON pupil_discounts(pupil_id);
CREATE INDEX idx_pupil_discounts_active ON pupil_discounts(is_active);

CREATE UNIQUE INDEX idx_unique_rct_per_school_fee
ON installments (school_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_rct_per_other_fee
ON installments (other_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

-- =====================================================
-- 4. TRIGGERS
-- ------------------------------------------------------------------------

-- Parent table trigger for updated_at
CREATE TRIGGER update_parents_updated_at
BEFORE UPDATE ON parents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Deactivate old discounts
CREATE OR REPLACE FUNCTION deactivate_old_discounts()
RETURNS TRIGGER AS $$
BEGIN
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

-- =====================================================
-- 5. VIEWS
-- ------------------------------------------------------------------------

-- Parent-Pupil view for joined data
CREATE OR REPLACE VIEW parent_pupil_view AS
SELECT 
    p.id as parent_id,
    p.parent_code,
    p.full_name as parent_name,
    p.phone as parent_phone,
    p.email as parent_email,
    p.nrc,
    p.address,
    p.occupation,
    p.emergency_contact,
    p.relationship_to_pupil,
    p.is_active as parent_is_active,
    p.created_at as parent_created_at,
    p.updated_at as parent_updated_at,
    pu.id as pupil_id,
    pu.full_name as pupil_name,
    pu.sex as pupil_sex,
    pu.status as pupil_status,
    g.name as grade_name,
    g.level_order as grade_level,
    ppr.relationship_type,
    ppr.is_primary_contact,
    ppr.created_at as relationship_created_at
FROM parents p
LEFT JOIN pupil_parent_relationships ppr ON p.id = ppr.parent_id
LEFT JOIN pupils pu ON ppr.pupil_id = pu.id
LEFT JOIN grades g ON pu.grade_id = g.id
WHERE p.is_active = TRUE;

-- Dashboard stats view
CREATE OR REPLACE VIEW dashboard_stats AS
WITH school_fees_summary AS (
  SELECT
    COUNT(DISTINCT sf.pupil_id) AS total_pupils,
    COALESCE(SUM(sf.total_expected), 0) AS school_fees_expected,
    COALESCE(SUM(sf.total_collected), 0) AS school_fees_collected,
    COALESCE(SUM(sf.balance), 0) AS school_fees_outstanding
  FROM school_fees sf
),
other_fees_summary AS (
  SELECT
    COALESCE(SUM(of.total_expected), 0) AS other_fees_expected,
    COALESCE(SUM(of.collected), 0) AS other_fees_collected,
    COALESCE(SUM(of.balance), 0) AS other_fees_outstanding
  FROM other_fees of
  WHERE of.is_enabled = true
)
SELECT
    sfs.total_pupils,
    sfs.school_fees_expected,
    sfs.school_fees_collected,
    sfs.school_fees_outstanding,
    ofs.other_fees_expected,
    ofs.other_fees_collected,
    ofs.other_fees_outstanding,
    (sfs.school_fees_expected + ofs.other_fees_expected) AS total_expected,
    (sfs.school_fees_collected + ofs.other_fees_collected) AS total_collected,
    (sfs.school_fees_outstanding + ofs.other_fees_outstanding) AS total_outstanding
FROM school_fees_summary sfs
CROSS JOIN other_fees_summary ofs;

-- Pupil financial summary view
CREATE OR REPLACE VIEW pupil_financial_summary AS
SELECT
    p.id,
    p.full_name,
    p.status,
    g.name AS grade_name,
    COALESCE(sf.total_expected, 0) AS school_fee_expected,
    COALESCE(sf.total_collected, 0) AS school_fee_collected,
    COALESCE(sf.balance, 0) AS school_fee_balance,
    COALESCE(of.total_expected, 0) AS other_fee_expected,
    COALESCE(of.collected, 0) AS other_fee_collected,
    COALESCE(of.balance, 0) AS other_fee_balance
FROM pupils p
LEFT JOIN grades g ON p.grade_id = g.id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id
WHERE of.is_enabled = true OR of.id IS NULL;

-- Other views (existing)
CREATE OR REPLACE VIEW outstanding_by_grade AS
SELECT
    g.name AS grade_name,
    g.level_order,
    COUNT(DISTINCT p.id) AS pupil_count,
    COALESCE(SUM(sf.balance), 0) + COALESCE(SUM(of.balance), 0) AS total_outstanding
FROM grades g
LEFT JOIN pupils p ON g.id = p.grade_id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id AND of.is_enabled = true
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
LEFT JOIN other_fees of ON t.id = of.term_id AND of.is_enabled = true
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
WHERE is_enabled = true
GROUP BY fee_type
ORDER BY fee_type;

-- =====================================================
-- 6. FUNCTIONS
-- ------------------------------------------------------------------------

-- Get applicable discount for a pupil/fee type/term
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
    SELECT pd.* INTO v_discount_record
    FROM pupil_discounts pd
    WHERE pd.pupil_id = p_pupil_id
      AND pd.is_active = true
      AND (pd.term_id IS NULL OR pd.term_id = p_term_id)
      AND (pd.applies_to = 'all' OR 
           (pd.applies_to = 'tuition' AND p_fee_type = 'school_fee') OR
           (pd.applies_to = 'transport' AND p_fee_type = 'transport') OR
           (pd.applies_to = 'lunch' AND p_fee_type = 'lunch'))
    ORDER BY 
        CASE WHEN pd.term_id = p_term_id THEN 1 ELSE 2 END,
        pd.created_at DESC
    LIMIT 1;
    
    RETURN 0; -- placeholder
END;
$$ LANGUAGE plpgsql;

-- Calculate net fee (used by payment function)
CREATE OR REPLACE FUNCTION calculate_net_fee(
    p_pupil_id UUID,
    p_fee_type VARCHAR(20),
    p_term_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_fee DECIMAL(10,2);
    v_discount DECIMAL(10,2);
BEGIN
    -- Get base fee from the fee tables
    IF p_fee_type = 'school_fee' THEN
        SELECT total_expected INTO v_base_fee
        FROM school_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSE
        SELECT total_expected INTO v_base_fee
        FROM other_fees
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id AND fee_type = p_fee_type;
    END IF;
    
    -- Get discount amount
    SELECT COALESCE(SUM(
        CASE WHEN pd.discount_type = 'percentage' THEN v_base_fee * pd.discount_value/100
             ELSE pd.discount_value END
    ), 0) INTO v_discount
    FROM pupil_discounts pd
    WHERE pd.pupil_id = p_pupil_id
      AND pd.is_active = true
      AND (pd.term_id IS NULL OR pd.term_id = p_term_id)
      AND (pd.applies_to = 'all' OR 
           (pd.applies_to = 'tuition' AND p_fee_type = 'school_fee') OR
           (pd.applies_to = 'transport' AND p_fee_type = 'transport') OR
           (pd.applies_to = 'lunch' AND p_fee_type = 'lunch'));
    
    RETURN COALESCE(v_base_fee, 0) - COALESCE(v_discount, 0);
END;
$$ LANGUAGE plpgsql;

-- Toggle pupil fee function
CREATE OR REPLACE FUNCTION toggle_pupil_fee(
    p_pupil_id UUID,
    p_fee_type VARCHAR(100),
    p_term_id UUID,
    p_new_expected DECIMAL(10,2) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_fee_record other_fees%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Lock the fee record to prevent concurrent modifications
    SELECT * INTO v_fee_record
    FROM other_fees
    WHERE pupil_id = p_pupil_id 
      AND fee_type = p_fee_type 
      AND term_id = p_term_id
    FOR UPDATE;

    IF v_fee_record.id IS NULL THEN
        RAISE EXCEPTION 'Fee record not found for pupil %, fee type %, term %', 
                        p_pupil_id, p_fee_type, p_term_id;
    END IF;

    -- Toggle the paid_toggle status
    v_fee_record.paid_toggle := NOT v_fee_record.paid_toggle;

    -- Update the expected amount if provided
    IF p_new_expected IS NOT NULL THEN
        v_fee_record.total_expected := p_new_expected;
        v_fee_record.balance := p_new_expected - v_fee_record.collected;
    END IF;

    -- Update the record
    UPDATE other_fees 
    SET 
        paid_toggle = v_fee_record.paid_toggle,
        total_expected = COALESCE(p_new_expected, total_expected),
        balance = COALESCE(p_new_expected, total_expected) - collected
    WHERE id = v_fee_record.id;

    -- Return the updated record as JSON
    v_result := jsonb_build_object(
        'success', true,
        'fee_id', v_fee_record.id,
        'paid_toggle', v_fee_record.paid_toggle,
        'total_expected', v_fee_record.total_expected,
        'balance', v_fee_record.balance,
        'message', CASE 
            WHEN v_fee_record.paid_toggle THEN 'Fee enabled for pupil'
            ELSE 'Fee disabled for pupil'
        END
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record payment (original, unchanged)
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
    IF p_school_fee_id IS NOT NULL THEN
        v_fee_type := 'school_fee';
        SELECT term_id INTO v_term_id FROM school_fees WHERE id = p_school_fee_id;
    ELSIF p_other_fee_id IS NOT NULL THEN
        SELECT fee_type, term_id INTO v_fee_type, v_term_id FROM other_fees WHERE id = p_other_fee_id;
    ELSE
        RAISE EXCEPTION 'Either school_fee_id or other_fee_id must be provided';
    END IF;
    
    v_net_fee := calculate_net_fee(p_pupil_id, v_fee_type, v_term_id);
    v_balance_remaining := v_net_fee - p_amount;
    
    IF v_balance_remaining < 0 THEN
        RAISE EXCEPTION 'Payment amount exceeds remaining balance';
    END IF;
    
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
    
    INSERT INTO transactions (
        pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
    ) VALUES (
        p_pupil_id, v_fee_type, p_amount, p_installment_no, p_rct_no, NOW(), 'system'
    );
    
    RETURN v_installment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main trigger: create all fees for a new pupil
CREATE OR REPLACE FUNCTION create_default_fees_for_new_pupil()
RETURNS TRIGGER AS $$
DECLARE
    current_term RECORD;
    family_count INTEGER;
    existing_ptc BOOLEAN;
    v_discount_amount DECIMAL(10,2);
    v_net_fee DECIMAL(10,2);
    v_transport_total DECIMAL(10,2);
    v_registration_exists BOOLEAN;
BEGIN
    -- Get the current active term (or latest if none active)
    SELECT id, term_number, months_count INTO current_term
    FROM terms
    ORDER BY start_date DESC
    LIMIT 1;

    IF current_term.id IS NULL THEN
        RETURN NEW; -- no term, cannot create fees
    END IF;

    -- 1. Ensure pupil belongs to a family
    IF NEW.family_id IS NULL AND NEW.parent_name IS NOT NULL THEN
        -- Try to find existing family by parent name and phone
        SELECT id INTO NEW.family_id
        FROM families
        WHERE families.parent_name = NEW.parent_name 
          AND (families.parent_phone = NEW.parent_phone OR (families.parent_phone IS NULL AND NEW.parent_phone IS NULL))
        LIMIT 1;

        IF NEW.family_id IS NULL THEN
            INSERT INTO families (parent_name, parent_phone)
            VALUES (NEW.parent_name, NEW.parent_phone)
            RETURNING id INTO NEW.family_id;
        END IF;
    END IF;

    -- If still no family (no parent info), create a singleton family
    IF NEW.family_id IS NULL THEN
        INSERT INTO families (parent_name, parent_phone)
        VALUES ('Unknown', NULL)
        RETURNING id INTO NEW.family_id;
    END IF;

    -- 2. Count existing pupils in the family (excluding current, because it's not yet inserted)
    SELECT COUNT(*) INTO family_count
    FROM pupils
    WHERE family_id = NEW.family_id;

    -- 3. Apply sibling discount for school fees if this is not the first child
    IF family_count >= 1 THEN
        INSERT INTO pupil_discounts (
            pupil_id, discount_type, discount_value, applies_to, term_id, reason, created_by
        ) VALUES (
            NEW.id, 'percentage', 10.00, 'tuition', NULL, 'Sibling discount', 'system'
        );
    END IF;

    -- 4. Create school fee (with discount applied)
    v_discount_amount := 0;
    SELECT COALESCE(SUM(
        CASE WHEN pd.discount_type = 'percentage' THEN 2400 * pd.discount_value/100
             ELSE pd.discount_value END
    ), 0) INTO v_discount_amount
    FROM pupil_discounts pd
    WHERE pd.pupil_id = NEW.id
      AND pd.is_active = true
      AND (pd.term_id IS NULL OR pd.term_id = current_term.id)
      AND (pd.applies_to IN ('tuition', 'all'));
    
    v_net_fee := 2400 - v_discount_amount;
    INSERT INTO school_fees (pupil_id, term_id, total_expected, total_collected, balance)
    VALUES (NEW.id, current_term.id, v_net_fee, 0, v_net_fee);

    -- 5. Maintenance fee (always, per term) - DISABLED BY DEFAULT
    INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
    VALUES (NEW.id, current_term.id, 'Maintenance', 250, 0, 250, false);

    -- 6. Lunch fee (if pupil takes lunch) - DISABLED BY DEFAULT
    IF NEW.takes_lunch THEN
        INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
        VALUES (NEW.id, current_term.id, 'Lunch', 1200, 0, 1200, false);
    END IF;

    -- 7. Transport fee (if route assigned) - DISABLED BY DEFAULT
    IF NEW.transport_route_id IS NOT NULL THEN
        SELECT monthly_fee INTO v_transport_total
        FROM transport_routes
        WHERE id = NEW.transport_route_id;
        v_transport_total := v_transport_total * current_term.months_count;
        INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
        VALUES (NEW.id, current_term.id, 'Transport', v_transport_total, 0, v_transport_total, false);
    END IF;

    -- 8. Registration fee (one-off for new pupils) - DISABLED BY DEFAULT
    IF NEW.status = 'new' THEN
        -- Check if already registered (should not happen, but safe)
        SELECT EXISTS (
            SELECT 1 FROM other_fees 
            WHERE pupil_id = NEW.id AND fee_type = 'Registration'
        ) INTO v_registration_exists;
        IF NOT v_registration_exists THEN
            INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
            VALUES (NEW.id, current_term.id, 'Registration', 200, 0, 200, false);
        END IF;
    END IF;

    -- 9. Sports fund (only Term 1) - DISABLED BY DEFAULT
    IF current_term.term_number = 1 THEN
        INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
        VALUES (NEW.id, current_term.id, 'Sports', 200, 0, 200, false);
    END IF;

    -- 10. Library fee (only Term 1 and Grades 1–7) - DISABLED BY DEFAULT
    IF current_term.term_number = 1 THEN
        -- Check if grade level_order is between 4 and 10 (Grades 1–7)
        IF EXISTS (
            SELECT 1 FROM grades g
            WHERE g.id = NEW.grade_id AND g.level_order BETWEEN 4 AND 10
        ) THEN
            INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
            VALUES (NEW.id, current_term.id, 'Library', 270, 0, 270, false);
        END IF;
    END IF;

    -- 11. PTC fee (only once per family per term) - DISABLED BY DEFAULT
    SELECT EXISTS (
        SELECT 1 FROM other_fees of
        JOIN pupils p ON of.pupil_id = p.id
        WHERE p.family_id = NEW.family_id
          AND of.term_id = current_term.id
          AND of.fee_type = 'PTC'
    ) INTO existing_ptc;

    IF NOT existing_ptc THEN
        INSERT INTO other_fees (pupil_id, term_id, fee_type, total_expected, collected, balance, is_enabled)
        VALUES (
            NEW.id, 
            current_term.id, 
            'PTC', 
            CASE current_term.term_number 
                WHEN 1 THEN 300 
                ELSE 250 
            END, 
            0, 
            CASE current_term.term_number 
                WHEN 1 THEN 300 
                ELSE 250 
            END,
            false
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_default_fees
AFTER INSERT ON pupils
FOR EACH ROW
EXECUTE FUNCTION create_default_fees_for_new_pupil();

-- =====================================================
-- DATA INSERTION
-- =====================================================

-- Insert static data
INSERT INTO grades (id, name, level_order, section, is_active, default_fees, created_at) VALUES
('0ef7cf7e-e74c-4a0e-a3ba-d4f83f21c2fa', 'GRADE 4', 7, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('1b824c8e-f079-4852-ab3c-e8513124c357', 'GRADE 7', 10, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('4b97f311-672c-4f38-b081-75ad85835300', 'GRADE 3', 6, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('9b658afe-e97f-41ed-b587-1eda7a1d9580', 'GRADE 5', 8, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('9f1cb9af-6eb0-4d1d-bf45-d3ede123b62e', 'GRADE 2', 5, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('afb030d3-22cd-4bd7-ab94-84bdd83dc2bf', 'RECEPTION', 3, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('bb60805a-901b-4313-bc2a-8d4341d111de', 'GRADE 6', 9, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00'),
('d64bb980-74ee-4353-92b0-18a470598fec', 'BABY CLASS', 1, null, true, ARRAY['Maintenance','Sports','PTC'], '2026-02-26 09:28:08.700598+00'),
('d7c21dcb-e49d-4e47-b80e-6bf35f8e1e96', 'MIDDLE CLASS', 2, null, true, ARRAY['Maintenance','Sports','PTC'], '2026-02-26 09:28:08.700598+00'),
('eb5a6e44-de4f-4dd4-90a1-5d811e42c2c5', 'GRADE 1', 4, null, true, ARRAY['Maintenance','Sports','Library','PTC'], '2026-02-26 09:28:08.700598+00');

INSERT INTO terms (id, name, start_date, end_date, term_number, months_count, is_active, created_at) VALUES
('bb7f5354-ac83-42b1-b14c-dcbb578b23fb', 'Term 1 2026', '2026-01-01', '2026-04-30', 1, 4, true, '2026-02-26 09:28:08.700598+00');

INSERT INTO transport_routes (route_name, monthly_fee) VALUES
-- Northern Route
('Makali/Surya', 500),
('Checkpoint/Kalebalika', 500),
('Kalabo/Mr Jungle Shop', 550),
('Redeemer Road', 500),
('Redeemer School', 550),
('Oasis Filling Station', 500),
('AMS Factory', 550),
('Tick Road', 700),
('Munsaka Lodge', 550),
('PDF', 600),
('15 Miles', 600),
('Bushland', 700),
('Laybye/18 Miles', 750),
('Katuba', 800),
('Green Roof', 850),
-- Southern Route
('Baiton/Karan Garage', 550),
('Moomba Area', 500),
('Muchenje', 950),
('9 Miles', 600),
('10 to 10', 550),
('Bridge', 650),
('Mungule Market', 700),
('Savanna Down', 550),
('Savanna Up', 550),
('Yellow Shop', 600),
('Katete', 800),
('Mutakwa', 700),
('Mai Bbusa', 650),
('Malasha', 550),
('New Apostolic / Layby', 550);

-- Insert school settings
INSERT INTO school_settings (key, value) VALUES
('admission_threshold', '0.5');

-- =====================================================
-- UNIFIED SCHEMA COMPLETE
-- =====================================================
