-- =====================================================
-- COMPLETE SCHOOL SYSTEM DATABASE SCHEMA
-- Includes all 156 pupils + updated discount logic
-- =====================================================

-- 1. CLEAN EXISTING DATABASE

-- 2. CREATE TABLES WITH PUPIL-LEVEL DISCOUNTS

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

-- NEW: PUPIL DISCOUNTS TABLE (PUPIL-LEVEL DISCOUNTS)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT other_balance_non_negative CHECK (balance >= 0)
);

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

-- NEW: Payment log table for debugging
CREATE TABLE payment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT,
    parameters JSONB,
    old_record JSONB,
    new_record JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Payment edit audit trail
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

CREATE INDEX idx_installments_pupil_id ON installments(pupil_id);
CREATE INDEX idx_installments_school_fee_id ON installments(school_fee_id);
CREATE INDEX idx_installments_other_fee_id ON installments(other_fee_id);
CREATE INDEX idx_installments_created_at ON installments(created_at);

CREATE INDEX idx_transactions_pupil_id ON transactions(pupil_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_pupil_discounts_pupil_id ON pupil_discounts(pupil_id);
CREATE INDEX idx_pupil_discounts_active ON pupil_discounts(is_active);

-- UNIQUE CONSTRAINT: Prevent duplicate receipts for the same school fee
CREATE UNIQUE INDEX idx_unique_rct_per_school_fee
ON installments (school_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_rct_per_other_fee
ON installments (other_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

-- 4. UPDATED VIEWS WITH PUPIL-LEVEL DISCOUNTS

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
LEFT JOIN other_fees of ON p.id = of.pupil_id
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
LEFT JOIN other_fees of ON p.id = of.pupil_id
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
LEFT JOIN other_fees of ON t.id = of.term_id
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
GROUP BY fee_type
ORDER BY fee_type;

-- 5. UPDATED STORED PROCEDURES (NO DISCOUNT PARAMETERS)

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
        WHERE pupil_id = p_pupil_id AND term_id = p_term_id;
    ELSE
        RETURN 0;
    END IF;
    
    -- Get discount
    v_discount := get_pupil_discount(p_pupil_id, p_fee_type, p_term_id);
    
    RETURN COALESCE(v_base_fee, 0) - COALESCE(v_discount, 0);
END;
$$ LANGUAGE plpgsql;

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

-- 6. TRIGGER FOR AUTOMATIC DEFAULT FEES (UPDATED FOR PUPIL DISCOUNTS)

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
            pupil_id, term_id, fee_type, total_expected, collected, balance, paid_toggle
          ) VALUES (
            NEW.id, current_term_id, fee_type, v_net_fee, 0, v_net_fee, FALSE
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

-- 7. INSERT SAMPLE DATA (ALL 156 PUPILS)

-- Insert Grades
INSERT INTO grades (name, level_order, default_fees) VALUES
  ('BABY CLASS', 1, ARRAY['Maintenance', 'Sports', 'PTC']),
  ('MIDDLE CLASS', 2, ARRAY['Maintenance', 'Sports', 'PTC']),
  ('RECEPTION', 3, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 1', 4, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 2', 5, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 3', 6, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 4', 7, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 5', 8, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 6', 9, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']),
  ('GRADE 7', 10, ARRAY['Maintenance', 'Sports', 'Library', 'PTC']);

-- Insert active term
INSERT INTO terms (name, start_date, end_date, is_active) VALUES
  ('Term 1 2026', '2026-01-01', '2026-04-30', TRUE);

-- Insert school setting
INSERT INTO school_settings (key, value) VALUES
  ('admission_threshold', '0.5');

-- Insert ALL 156 PUPILS (the trigger will create fees automatically)

-- BABY CLASS (8 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('TEDD CHOONGO', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('KALUNGA JOSHUA', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('JOSHUA MWANSA', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('MASAMA ALBERT', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('NATHAN ZULU', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('NICHOLAS', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('TWAZANGA DIALLO ELINA', 'F', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('LIMPO JEMIMAH LIFWATILA', 'F', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new');

-- MIDDLE CLASS (19 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('MIRRISA MAY', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('WINNER NIBABAZI', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'new'),
  ('JEMIMAH DAKA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('MWENYA BLESSING', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('SHAKINAH PHIRI', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('MUKUNDI BAMBALA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('IMALAIKA IMANI', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('JAMAR BWALYA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('LUSHOMO HACHAMBA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('JANE THINDWA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('IPYANA MWASAGA', 'M', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('JOEL MULUMBI', 'M', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('MUMBA KASUBA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'new'),
  ('JADEN KANGACHEPE', 'M', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'new'),
  ('KYLIE MWENDA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('CARISSA MOONDE', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('MALUBA MUNSAKA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old'),
  ('MONISHA', 'F', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'new'),
  ('WAMPA BWALYA', 'M', (SELECT id FROM grades WHERE name = 'MIDDLE CLASS'), 'old');

-- RECEPTION (22 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('RABECCA MIYOBA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('NANDIPA BANDA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('FELISTUS NDENDE', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('TINASHE NYANGA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('LILATO SIKAPA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('ATTALIA PHIRI', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('IZUKANJI CHULU', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('LUYANDO HABANJI', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('CINDY CHANDA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'new'),
  ('MAYAMIKO MUSHANGA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('MERCY SAKALA', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('RENISIA CHIMBWALUME', 'F', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('JOSHUA MUMBA', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('WEZI KALIMAZONDO', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('BARNABAS MUSHAYABANU', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('FUMBANI MPHANDE', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('BENJAMIN KABWIKU', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('KUZIPA MPANDE', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('ONGANI KAMANGA', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('CHIMWEMWE LUNGU', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'old'),
  ('ANDRE LWEKO', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'new'),
  ('JASON TEMBO', 'M', (SELECT id FROM grades WHERE name = 'RECEPTION'), 'new');

-- GRADE 1 (21 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('ERNEST LIFWATILA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('GIFT NIMBABAZI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'new'),
  ('WALTON SEMANI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('FAVOUR CHISUPA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('TATENDA MANOEYA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'new'),
  ('RYLEE MWENDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('CRAIGE BUUMBA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'new'),
  ('CHIPEGO SIKALINDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('CHISUNGUSHO MWILA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('NAVIL LIFUMBELA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('LIMPO NOTULU', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'new'),
  ('THELMA KALOMBO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('SHAWNA NAMFUKWE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('JASMINE LUMWAYO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('MAUREEN MWENYA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('TRIZAH KATAI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('FAVOUR CHISPASHA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('ZEPPORAH KAMBOLE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('PRINCESS NGAMBI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('LUSE BWALYA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old'),
  ('SHEKINAH KABAMBA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 1'), 'old');

-- GRADE 2 (15 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('CHANDA TINOTENDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('CHEMBE LUCKY', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('CHEWE KALENGA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('SARAH PHIRI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('CHABOTA SIKALINDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('ZULU ESTHER', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('TEMBO JEDAIDAH', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('MARTHA CHIKOTI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'new'),
  ('FULARA MWAKAPIKI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'new'),
  ('GIFT NIMBABAZI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'new'),
  ('HIBUSENGA CHILELEKO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'new'),
  ('KAMPAMBA JOSHUA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('MWANSA EMMANUEL', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old'),
  ('DANIEL SAKALA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'new'),
  ('KUZWAYO DAKA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 2'), 'old');

-- GRADE 3 (18 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('SALIFYANJI NACHILIMA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('NOTULU LISELI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('LUYANDO MUDENDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('NATASHA BAMBALA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('MIYOBA CHRISTINE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('ELIDA CHANDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('WINNIE SIALUMBA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('NIBABAZI MILKA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('JEMIMAH MULUMBI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('NANCY BUUMBA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('OLIVIA MPANDE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('GIFT MWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('ETHAN ZULU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('LAWRENCE BANDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('PATRICK SAKALA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('ALAM SIALUMBA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('SHYANE SINIFUKWE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old'),
  ('EMMANUEL HACHABA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'new'),
  ('NYEM LUSHOMO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 3'), 'old');

-- GRADE 4 (11 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('KUNDEZHI KABWIKU', 'F', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('PATIACE KAWEWE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('HANAHMARIA KUDONGO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('GRACE TEMBO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'new'),
  ('TAILA ZOMBI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('WANDIPAH MANDEXA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('NGENDA TAPELO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('DAVID PONDO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('ISHMAEL MAREBESA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('ATUPELE MWASAGA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old'),
  ('ETHAN CHEMBE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 4'), 'old');

-- GRADE 5 (8 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('CHELSEA SHULTZ', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('GRACE JERE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('GINNAH MWASAGA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('PHOEBBIE KAOMA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'new'),
  ('ISAAC MWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('NAVID LIFUMBELA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('LUIS DAKA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('AIDEN CHIRWA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old');

-- GRADE 6 (19 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('MARTHA MTONGA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('NDENDE BLESSING', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('DEBORAH KAWEWE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('CHEWE ESTHER', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('RUTH THINDWA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('JANICE PHIRI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('NANDI T DAKA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('RODAH TEMBO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('WALUSUNGU JAY BANDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'new'),
  ('TRINITY SIMWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('LUBONO LUSONDE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('MWAMBWA MUTENDE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('EMMANUEL CHISUPA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('CHILONDELA RYAN', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('WILLA SICHILIMA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('ROBERT CHISAMBA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('MOSES CHUMBWALUME', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('MADALITSO LUNGU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'new'),
  ('emmanuel kabamba', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old');

-- GRADE 7 (14 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('TWAAMBO HACHILENSA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('CHUMI ZOMBE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('JANET CHIBESA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('PRECIOUS MAZUBA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('ISABELLA BANDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('FAITH MWAMULIMA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('WHYNESS SEMANI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('TANYA DAKA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('ISRAEL JERE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('JEFFERSON MULUMBI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('TABO NGENDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('PRESILY KALUWE', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('ALINASE KAMUNGU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('CHIKUZA JAY BANDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old');

-- 8. SAMPLE DISCOUNT DATA (PUPIL-LEVEL DISCOUNTS)
INSERT INTO pupil_discounts (pupil_id, discount_type, discount_value, applies_to, reason, created_by) VALUES
  ((SELECT id FROM pupils WHERE full_name = 'TEDD CHOONGO'), 'percentage', 10.00, 'tuition', 'Staff Child Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'MIRRISA MAY'), 'percentage', 15.00, 'all', 'Scholarship', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'RABECCA MIYOBA'), 'fixed', 200.00, 'tuition', 'Sibling Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'ERNEST LIFWATILA'), 'percentage', 5.00, 'transport', 'Transport Discount', 'admin'),
  ((SELECT id FROM pupils WHERE full_name = 'CHANDA TINOTENDA'), 'percentage', 20.00, 'all', 'Academic Scholarship', 'admin');

-- 9. VERIFICATION QUERIES
-- Run these to verify everything is working:

-- Verify pupil count (should be 156)
-- SELECT COUNT(*) as total_pupils FROM pupils;

-- Verify fees were created
-- SELECT COUNT(*) as school_fees FROM school_fees;
-- SELECT COUNT(*) as other_fees FROM other_fees;

-- Verify discounts
-- SELECT COUNT(*) as discounts FROM pupil_discounts WHERE is_active = true;

-- Verify dashboard stats
-- SELECT * FROM dashboard_stats;

-- =====================================================
-- MIGRATION COMPLETE - PUPIL-LEVEL DISCOUNTS IMPLEMENTED
-- All 156 pupils restored with proper discount logic
-- =====================================================
