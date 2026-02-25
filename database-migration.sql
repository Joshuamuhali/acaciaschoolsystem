-- =============================================
-- SCHOOL SYSTEM DATABASE MIGRATION
-- Complete Schema with Grade Default Fees
-- Ready to Run in Supabase SQL Editor
-- =============================================

-- 1. DROP EXISTING TABLES (if running migration on existing database)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS other_fees CASCADE;
DROP TABLE IF EXISTS school_fees CASCADE;
DROP TABLE IF EXISTS pupils CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS school_settings CASCADE;

-- 2. CREATE TABLES
-- ------------------------------------------------------------

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL,
    school_fee_id UUID REFERENCES school_fees(id),
    other_fee_type VARCHAR(50),
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

-- 3. CREATE INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_pupils_status ON pupils(status);
CREATE INDEX idx_pupils_grade_id ON pupils(grade_id);
CREATE INDEX idx_pupils_full_name ON pupils(full_name);

CREATE INDEX idx_school_fees_pupil_id ON school_fees(pupil_id);
CREATE INDEX idx_school_fees_term_id ON school_fees(term_id);
CREATE INDEX idx_school_fees_paid_toggle ON school_fees(paid_toggle);

CREATE INDEX idx_other_fees_pupil_id ON other_fees(pupil_id);
CREATE INDEX idx_other_fees_term_id ON other_fees(term_id);
CREATE INDEX idx_other_fees_paid_toggle ON other_fees(paid_toggle);

CREATE INDEX idx_installments_pupil_id ON installments(pupil_id);
CREATE INDEX idx_installments_school_fee_id ON installments(school_fee_id);
CREATE INDEX idx_installments_created_at ON installments(created_at);

CREATE INDEX idx_transactions_pupil_id ON transactions(pupil_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- 4. CREATE VIEWS (Fixed references to collected)
-- ------------------------------------------------------------

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
    COALESCE(SUM(sf.total_expected), 0) AS school_fees_expected,
    COALESCE(SUM(sf.total_collected), 0) AS school_fees_collected,
    COALESCE(SUM(sf.balance), 0) AS school_fees_outstanding,
    -- Other fees stats
    COALESCE(SUM(of.total_expected), 0) AS other_fees_expected,
    COALESCE(SUM(of.collected), 0) AS other_fees_collected,
    COALESCE(SUM(of.balance), 0) AS other_fees_outstanding,
    -- Combined totals (for backward compatibility)
    COALESCE(SUM(sf.total_expected), 0) + COALESCE(SUM(of.total_expected), 0) AS total_expected_fees,
    COALESCE(SUM(sf.total_collected), 0) + COALESCE(SUM(of.collected), 0) AS total_collected,
    COALESCE(SUM(sf.balance), 0) + COALESCE(SUM(of.balance), 0) AS total_outstanding
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

-- 5. STORED PROCEDURES FOR PAYMENTS
-- ------------------------------------------------------------

-- 5.1 Process School Fee Payment
CREATE OR REPLACE FUNCTION process_school_fee_payment(
  p_pupil_id UUID,
  p_school_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_rct_no TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_fee_record RECORD;
  v_new_collected DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_installment_no INTEGER;
  v_admission_threshold DECIMAL(5,2) := 0.5;
BEGIN
  SELECT * INTO v_fee_record
  FROM school_fees
  WHERE id = p_school_fee_id AND pupil_id = p_pupil_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School fee record not found for pupil % and fee %', p_pupil_id, p_school_fee_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_amount > v_fee_record.balance THEN
    RAISE EXCEPTION 'Payment amount ZMW % exceeds outstanding balance ZMW %', p_amount, v_fee_record.balance;
  END IF;

  v_new_collected := v_fee_record.total_collected + p_amount;
  v_new_balance := v_fee_record.balance - p_amount;

  UPDATE school_fees
  SET
    total_collected = v_new_collected,
    balance = v_new_balance,
    paid_toggle = (v_new_balance <= 0)
  WHERE id = p_school_fee_id;

  SELECT COALESCE(MAX(installment_no), 0) + 1 INTO v_installment_no
  FROM installments
  WHERE school_fee_id = p_school_fee_id;

  INSERT INTO installments (
    pupil_id, school_fee_id, fee_type, installment_no, amount_paid,
    balance_remaining, rct_no, date_paid
  ) VALUES (
    p_pupil_id, p_school_fee_id, 'school_fee', v_installment_no, p_amount,
    v_new_balance, NULLIF(p_rct_no, ''), NOW()
  );

  INSERT INTO transactions (
    pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
  ) VALUES (
    p_pupil_id, 'school_fee', p_amount, v_installment_no, NULLIF(p_rct_no, ''), NOW(), 'system'
  );

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
    'auto_admitted', (v_new_collected >= (v_admission_threshold * v_fee_record.total_expected))
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'pupil_id', p_pupil_id,
      'school_fee_id', p_school_fee_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Process Other Fee Payment
CREATE OR REPLACE FUNCTION process_other_fee_payment(
  p_pupil_id UUID,
  p_other_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_rct_no TEXT
) RETURNS JSON AS $$
DECLARE
  v_fee_record RECORD;
  v_new_collected DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
BEGIN
  SELECT * INTO v_fee_record
  FROM other_fees
  WHERE id = p_other_fee_id AND pupil_id = p_pupil_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Other fee record not found';
  END IF;

  IF p_amount > v_fee_record.balance THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
  END IF;

  v_new_collected := v_fee_record.collected + p_amount;
  v_new_balance := v_fee_record.balance - p_amount;

  UPDATE other_fees
  SET
    collected = v_new_collected,
    balance = v_new_balance,
    paid_toggle = (v_new_balance <= 0)
  WHERE id = p_other_fee_id;

  INSERT INTO transactions (
    pupil_id, fee_type, amount, installment_no, rct_no, date_paid, recorded_by
  ) VALUES (
    p_pupil_id, v_fee_record.fee_type, p_amount, NULL, p_rct_no, NOW(), 'system'
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER FOR AUTOMATIC DEFAULT FEES
-- ------------------------------------------------------------
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

CREATE OR REPLACE TRIGGER trigger_create_default_fees
AFTER INSERT ON pupils
FOR EACH ROW
EXECUTE FUNCTION create_default_fees_for_new_pupil();

-- 7. OPTIONAL SAMPLE DATA (uncomment to use)
-- ------------------------------------------------------------
-- INSERT INTO grades (name, level_order, default_fees) VALUES
--   ('Grade 1', 1, ARRAY['Maintenance', 'Sports']),
--   ('Grade 2', 2, ARRAY['Library', 'PTC']),
--   ('Grade 3', 3, ARRAY['Maintenance', 'Sports', 'Library']);

-- INSERT INTO terms (name, start_date, end_date) VALUES
--   ('Term 1 2024', '2024-01-15', '2024-04-15'),
--   ('Term 2 2024', '2024-04-16', '2024-07-15');

-- INSERT INTO school_settings (key, value) VALUES
--   ('admission_threshold', '0.5');

-- =============================================
-- MIGRATION COMPLETE
-- =============================================