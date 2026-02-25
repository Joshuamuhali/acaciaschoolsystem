-- =============================================
-- SCHOOL SYSTEM DATABASE - FINAL FIXED SCHEMA
-- (Duplicates removed – run this once)
-- =============================================

-- 1. DROP EXISTING TABLES (if any)
DROP TABLE IF EXISTS payment_log CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS other_fees CASCADE;
DROP TABLE IF EXISTS school_fees CASCADE;
DROP TABLE IF EXISTS pupils CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS school_settings CASCADE;

-- 2. CREATE TABLES
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
    discount_applied DECIMAL(5,2) DEFAULT 0,
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
    old_discount_applied DECIMAL(5,2),
    new_discount_applied DECIMAL(5,2),
    old_rct_no VARCHAR(100),
    new_rct_no VARCHAR(100),
    reason TEXT
);

-- NEW: Function to log payment edits
CREATE OR REPLACE FUNCTION log_payment_edit(
    p_installment_id UUID,
    p_old_amount DECIMAL(10,2),
    p_new_amount DECIMAL(10,2),
    p_old_discount DECIMAL(5,2),
    p_new_discount DECIMAL(5,2),
    p_old_rct VARCHAR(100),
    p_new_rct VARCHAR(100),
    p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO payment_edit_log (
        installment_id,
        edited_by,
        old_amount_paid,
        new_amount_paid,
        old_discount_applied,
        new_discount_applied,
        old_rct_no,
        new_rct_no,
        reason
    ) VALUES (
        p_installment_id,
        current_setting('app.current_user', true),
        p_old_amount,
        p_new_amount,
        p_old_discount,
        p_new_discount,
        p_old_rct,
        p_new_rct,
        p_reason
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- UNIQUE CONSTRAINT: Prevent duplicate receipts for the same school fee
CREATE UNIQUE INDEX idx_unique_rct_per_school_fee
ON installments (school_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

-- Similarly for other fees (optional)
CREATE UNIQUE INDEX idx_unique_rct_per_other_fee
ON installments (other_fee_id, RCT_no)
WHERE RCT_no IS NOT NULL;

-- 4. VIEWS

-- NEW: Accurate dashboard stats view with discount handling
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
    COUNT(DISTINCT i.pupil_id) AS pupils_with_discounts,
    COUNT(i.id) AS total_discounted_payments,
    COALESCE(SUM(i.amount_paid * i.discount_applied / 100), 0) AS total_discount_amount
  FROM installments i
  WHERE i.discount_applied > 0
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
    ds.total_discounted_payments,
    ds.total_discount_amount
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
    (COALESCE(sf.balance, 0) + COALESCE(of.balance, 0)) AS total_balance
FROM pupils p
LEFT JOIN grades g ON p.grade_id = g.id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id;

CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    COUNT(DISTINCT p.id) AS total_pupils,
    COUNT(DISTINCT CASE WHEN p.status = 'admitted' THEN p.id END) AS admitted_pupils,
    COUNT(DISTINCT CASE WHEN p.status = 'new' THEN p.id END) AS new_pupils,
    COUNT(DISTINCT g.id) AS total_grades,
    -- School fees stats
    (COUNT(DISTINCT p.id) * 2400) AS school_fees_expected,
    COALESCE(SUM(sf.total_collected), 0) AS school_fees_collected,
    ((COUNT(DISTINCT p.id) * 2400) - COALESCE(SUM(sf.total_collected), 0)) AS school_fees_outstanding,
    -- Other fees stats
    COALESCE(SUM(of.total_expected), 0) AS other_fees_expected,
    COALESCE(SUM(of.collected), 0) AS other_fees_collected,
    COALESCE(SUM(of.balance), 0) AS other_fees_outstanding,
    -- Combined totals
    (COUNT(DISTINCT p.id) * 2400) + COALESCE(SUM(of.total_expected), 0) AS total_expected_fees,
    COALESCE(SUM(sf.total_collected), 0) + COALESCE(SUM(of.collected), 0) AS total_collected,
    ((COUNT(DISTINCT p.id) * 2400) - COALESCE(SUM(sf.total_collected), 0)) + COALESCE(SUM(of.balance), 0) AS total_outstanding,
    -- Discounts applied
    (SELECT COUNT(*) FROM installments WHERE discount_applied > 0) AS total_discounts_applied
FROM pupils p
LEFT JOIN grades g ON p.grade_id = g.id
LEFT JOIN school_fees sf ON p.id = sf.pupil_id
LEFT JOIN other_fees of ON p.id = of.pupil_id;

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

-- 5. STORED PROCEDURES (with logging)

-- 5.1 Process School Fee Payment
CREATE OR REPLACE FUNCTION process_school_fee_payment(
  p_pupil_id UUID,
  p_school_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_discount DECIMAL(5,2) DEFAULT 0,
  p_rct_no TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_fee_record RECORD;
  v_new_collected DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_effective_amount DECIMAL(10,2);
  v_installment_no INTEGER;
  v_admission_threshold DECIMAL(5,2) := 0.5;
  v_log_id UUID;
BEGIN
  -- Log the attempt
  INSERT INTO payment_log (function_name, parameters)
  VALUES ('process_school_fee_payment', jsonb_build_object(
    'p_pupil_id', p_pupil_id,
    'p_school_fee_id', p_school_fee_id,
    'p_amount', p_amount,
    'p_discount', p_discount,
    'p_rct_no', p_rct_no
  )) RETURNING id INTO v_log_id;

  SELECT * INTO v_fee_record
  FROM school_fees
  WHERE id = p_school_fee_id AND pupil_id = p_pupil_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School fee record not found for pupil % and fee %', p_pupil_id, p_school_fee_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_discount < 0 OR p_discount > 100 THEN
    RAISE EXCEPTION 'Discount percentage must be between 0 and 100';
  END IF;

  IF p_amount > v_fee_record.balance THEN
    RAISE EXCEPTION 'Payment amount ZMW % exceeds outstanding balance ZMW %', p_amount, v_fee_record.balance;
  END IF;

  -- Check maximum installments (3)
  IF (SELECT COUNT(*) FROM installments WHERE school_fee_id = p_school_fee_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 installments allowed for this school fee.';
  END IF;

  -- Calculate effective amount after discount
  v_effective_amount := p_amount - (p_amount * p_discount / 100);

  v_new_collected := v_fee_record.total_collected + v_effective_amount;
  v_new_balance := v_fee_record.balance - v_effective_amount;

  UPDATE school_fees
  SET
    total_collected = v_new_collected,
    balance = v_new_balance,
    paid_toggle = (v_new_balance <= 0)
  WHERE id = p_school_fee_id
  RETURNING * INTO v_fee_record;  -- capture updated record

  SELECT COALESCE(MAX(installment_no), 0) + 1 INTO v_installment_no
  FROM installments
  WHERE school_fee_id = p_school_fee_id;

  INSERT INTO installments (
    pupil_id, school_fee_id, fee_type, installment_no, amount_paid, discount_applied,
    balance_remaining, rct_no, date_paid
  ) VALUES (
    p_pupil_id, p_school_fee_id, 'school_fee', v_installment_no, p_amount, p_discount,
    v_new_balance, NULLIF(p_rct_no, ''), NOW()
  );

  INSERT INTO transactions (
    pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
  ) VALUES (
    p_pupil_id, 'school_fee', p_amount, v_installment_no, NULLIF(p_rct_no, ''), NOW(), 'system'
  );

  -- Log new record
  UPDATE payment_log
  SET new_record = to_jsonb(v_fee_record)
  WHERE id = v_log_id;

  BEGIN
    SELECT value::DECIMAL INTO v_admission_threshold
    FROM school_settings
    WHERE key = 'admission_threshold';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN v_admission_threshold := 0.5;
    WHEN OTHERS THEN v_admission_threshold := 0.5;
  END;

  IF v_new_collected >= (v_admission_threshold * v_fee_record.total_expected) THEN
    UPDATE pupils
    SET status = 'admitted', admission_blocked = FALSE
    WHERE id = p_pupil_id AND status != 'admitted';
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'installment_no', v_installment_no,
    'total_collected', v_new_collected,
    'payment_amount', p_amount,
    'effective_amount', v_effective_amount,
    'discount_applied', p_discount,
    'auto_admitted', (v_new_collected >= (v_admission_threshold * v_fee_record.total_expected))
  );

EXCEPTION
  WHEN OTHERS THEN
    UPDATE payment_log
    SET error = SQLERRM
    WHERE id = v_log_id;

    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'pupil_id', p_pupil_id,
      'school_fee_id', p_school_fee_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Process Other Fee Payment (with logging)
CREATE OR REPLACE FUNCTION process_other_fee_payment(
  p_pupil_id UUID,
  p_other_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_discount DECIMAL(5,2) DEFAULT 0,
  p_rct_no TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_fee_record RECORD;
  v_new_collected DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_effective_amount DECIMAL(10,2);
  v_log_id UUID;
BEGIN
  INSERT INTO payment_log (function_name, parameters)
  VALUES ('process_other_fee_payment', jsonb_build_object(
    'p_pupil_id', p_pupil_id,
    'p_other_fee_id', p_other_fee_id,
    'p_amount', p_amount,
    'p_discount', p_discount,
    'p_rct_no', p_rct_no
  )) RETURNING id INTO v_log_id;

  SELECT * INTO v_fee_record
  FROM other_fees
  WHERE id = p_other_fee_id AND pupil_id = p_pupil_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Other fee record not found';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_discount < 0 OR p_discount > 100 THEN
    RAISE EXCEPTION 'Discount percentage must be between 0 and 100';
  END IF;

  IF p_amount > v_fee_record.balance THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
  END IF;

  -- Check maximum installments (3)
  IF (SELECT COUNT(*) FROM installments WHERE other_fee_id = p_other_fee_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 installments allowed for this other fee.';
  END IF;

  -- Calculate effective amount after discount
  v_effective_amount := p_amount - (p_amount * p_discount / 100);

  v_new_collected := v_fee_record.collected + v_effective_amount;
  v_new_balance := v_fee_record.balance - v_effective_amount;

  UPDATE other_fees
  SET
    collected = v_new_collected,
    balance = v_new_balance,
    paid_toggle = (v_new_balance <= 0)
  WHERE id = p_other_fee_id
  RETURNING * INTO v_fee_record;

  INSERT INTO installments (
    pupil_id, other_fee_id, fee_type, installment_no, amount_paid, discount_applied,
    balance_remaining, rct_no, date_paid
  ) VALUES (
    p_pupil_id, p_other_fee_id, v_fee_record.fee_type,
    (SELECT COALESCE(MAX(installment_no), 0) + 1 FROM installments WHERE other_fee_id = p_other_fee_id),
    p_amount, p_discount, v_new_balance, NULLIF(p_rct_no, ''), NOW()
  );

  INSERT INTO transactions (
    pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
  ) VALUES (
    p_pupil_id, v_fee_record.fee_type, p_amount, NULL, p_rct_no, NOW(), 'system'
  );

  UPDATE payment_log
  SET new_record = to_jsonb(v_fee_record)
  WHERE id = v_log_id;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'effective_amount', v_effective_amount,
    'discount_applied', p_discount
  );

EXCEPTION
  WHEN OTHERS THEN
    UPDATE payment_log
    SET error = SQLERRM
    WHERE id = v_log_id;

    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER FOR AUTOMATIC DEFAULT FEES
CREATE OR REPLACE FUNCTION create_default_fees_for_new_pupil()
RETURNS TRIGGER AS $$
DECLARE
  current_term_id UUID;
  grade_default_fees TEXT[];
  fee_type TEXT;
  fee_amount INTEGER;
BEGIN
  SELECT id INTO current_term_id
  FROM terms
  ORDER BY start_date DESC
  LIMIT 1;

  IF current_term_id IS NOT NULL THEN
    -- Always create school fee (2400)
    INSERT INTO school_fees (
      pupil_id, term_id, total_expected, total_collected, balance, paid_toggle
    ) VALUES (
      NEW.id, current_term_id, 2400, 0, 2400, FALSE
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
          INSERT INTO other_fees (
            pupil_id, term_id, fee_type, total_expected, collected, balance, paid_toggle
          ) VALUES (
            NEW.id, current_term_id, fee_type, fee_amount, 0, fee_amount, FALSE
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

-- 7. INSERT SAMPLE DATA (ONCE)
-- ------------------------------------------------------------

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

-- Insert school setting (idempotent)
INSERT INTO school_settings (key, value) VALUES
  ('admission_threshold', '0.5')
ON CONFLICT (key) DO NOTHING;

-- Insert pupils (the trigger will create fees automatically)
-- BABY CLASS
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('TEDD CHOONGO', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('KALUNGA JOSHUA', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('JOSHUA MWANSA', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('MASAMA ALBERT', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('NATHAN ZULU', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('NICHOLAS', 'M', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('TWAZANGA DIALLO ELINA', 'F', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new'),
  ('LIMPO JEMIMAH LIFWATILA', 'F', (SELECT id FROM grades WHERE name = 'BABY CLASS'), 'new');

-- MIDDLE CLASS
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

-- RECEPTION
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

-- GRADE 1
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

-- GRADE 2
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

-- GRADE 3
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

-- GRADE 4
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

-- GRADE 5
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('CHELSEA SHULTZ', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('GRACE JERE', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('GINNAH MWASAGA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('PHOEBBIE KAOMA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'new'),
  ('ISAAC MWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('NAVID LIFUMBELA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('LUIS DAKA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old'),
  ('AIDEN CHIRWA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 5'), 'old');

-- GRADE 6
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

-- GRADE 7
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

-- =============================================
-- MIGRATION COMPLETE - ALL BOTTLENECKS FIXED
-- Outstanding: Expected - Collected 
-- Lunch Fee: Added at 1,200 ZMW 
-- Other Fees Breakdown View Added 
-- =============================================

-- Add discount_applied column to installments if it doesn't exist
ALTER TABLE installments ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(5,2) DEFAULT 0;