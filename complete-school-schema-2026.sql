-- ==========================================
-- SCHOOL MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- ==========================================
-- Updated: February 2026
-- Purpose: Complete database schema for school fee management system

-- ==========================================
-- DROP OLD TABLES (SAFE RESET)
-- ==========================================

DROP TABLE IF EXISTS pupil_transport CASCADE;
DROP TABLE IF EXISTS transport_routes CASCADE;
DROP TABLE IF EXISTS ptc_payments CASCADE;
DROP TABLE IF EXISTS pupil_other_fees CASCADE;
DROP TABLE IF EXISTS other_fee_types CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS pupil_discounts CASCADE;
DROP TABLE IF EXISTS pupils CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS academic_years CASCADE;
DROP TABLE IF EXISTS grades CASCADE;

-- ==========================================
-- GRADES
-- ==========================================

CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    level_order INT NOT NULL UNIQUE
);

INSERT INTO grades (name, level_order) VALUES
('BABY CLASS',1),
('MIDDLE CLASS',2),
('RECEPTION',3),
('GRADE 1',4),
('GRADE 2',5),
('GRADE 3',6),
('GRADE 4',7),
('GRADE 5',8),
('GRADE 6',9),
('GRADE 7',10);

-- ==========================================
-- ACADEMIC YEARS
-- ==========================================

CREATE TABLE academic_years (
    id SERIAL PRIMARY KEY,
    year_name VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE
);

INSERT INTO academic_years (year_name, is_active)
VALUES ('2026', TRUE);

-- ==========================================
-- TERMS
-- ==========================================

CREATE TABLE terms (
    id SERIAL PRIMARY KEY,
    academic_year_id INT REFERENCES academic_years(id) ON DELETE CASCADE,
    term_number INT CHECK (term_number IN (1,2,3)),
    is_active BOOLEAN DEFAULT FALSE,
    UNIQUE(academic_year_id, term_number)
);

INSERT INTO terms (academic_year_id, term_number, is_active)
VALUES
((SELECT id FROM academic_years WHERE year_name='2026'), 1, TRUE),
((SELECT id FROM academic_years WHERE year_name='2026'), 2, FALSE),
((SELECT id FROM academic_years WHERE year_name='2026'), 3, FALSE);

-- ==========================================
-- PARENTS
-- ==========================================

CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20)
);

-- ==========================================
-- PUPILS
-- ==========================================

CREATE TABLE pupils (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M','F')),
    parent_id INT REFERENCES parents(id) ON DELETE SET NULL,
    grade_id INT REFERENCES grades(id),
    status VARCHAR(20) DEFAULT 'pending'
);

-- ==========================================
-- ENROLLMENTS (TERM 1, 2026)
-- ==========================================

CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    pupil_id INT REFERENCES pupils(id) ON DELETE CASCADE,
    term_id INT REFERENCES terms(id) ON DELETE CASCADE,
    grade_id INT REFERENCES grades(id),
    status VARCHAR(20) DEFAULT 'pending',
    school_fees_expected DECIMAL(10,2) DEFAULT 2400,
    school_fees_paid DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pupil_id, term_id)
);

-- Populate enrollments for all pupils for term 1, 2026
INSERT INTO enrollments (pupil_id, term_id, grade_id, status, school_fees_expected, school_fees_paid)
SELECT
    p.id,
    t.id,
    p.grade_id,
    'pending',
    2400,
    0
FROM pupils p
JOIN terms t
    ON t.term_number = 1
    AND t.academic_year_id = (SELECT id FROM academic_years WHERE year_name='2026');

-- ==========================================
-- PAYMENTS
-- ==========================================

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES enrollments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- OTHER FEE TYPES
-- ==========================================

CREATE TABLE other_fee_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    amount DECIMAL(10,2),
    term_applicable INT NULL
);

INSERT INTO other_fee_types (name, amount, term_applicable) VALUES
('Lunch', 1200, NULL),
('Maintenance', 250, NULL),
('Registration', 200, NULL),
('Sports Fund', 200, 1),
('Library', 270, 1);

-- ==========================================
-- PUPIL OTHER FEES (BLANK)
-- ==========================================

CREATE TABLE pupil_other_fees (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES enrollments(id) ON DELETE CASCADE,
    fee_type_id INT REFERENCES other_fee_types(id),
    amount DECIMAL(10,2),
    amount_paid DECIMAL(10,2) DEFAULT 0
);

-- Optional: Populate blank pupil_other_fees for all pupils (ready to toggle later)
INSERT INTO pupil_other_fees (enrollment_id, fee_type_id, amount, amount_paid)
SELECT e.id, f.id, f.amount, 0
FROM enrollments e
CROSS JOIN other_fee_types f;

-- ==========================================
-- PTC PAYMENTS
-- ==========================================

CREATE TABLE ptc_payments (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES parents(id),
    term_id INT REFERENCES terms(id),
    amount DECIMAL(10,2),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    UNIQUE(parent_id, term_id)
);

-- ==========================================
-- TRANSPORT ROUTES
-- ==========================================

CREATE TABLE transport_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(200),
    monthly_fee DECIMAL(10,2)
);

CREATE TABLE pupil_transport (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES enrollments(id) ON DELETE CASCADE,
    route_id INT REFERENCES transport_routes(id),
    months INT DEFAULT 3,
    amount_paid DECIMAL(10,2) DEFAULT 0
);

-- ==========================================
-- PUPIL DISCOUNTS
-- ==========================================

CREATE TABLE pupil_discounts (
    id SERIAL PRIMARY KEY,
    pupil_id INT REFERENCES pupils(id),
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage','fixed')),
    discount_value DECIMAL(10,2),
    applies_to VARCHAR(50),
    reason VARCHAR(200),
    created_by VARCHAR(50)
);

INSERT INTO academic_years (year_name, is_active)
VALUES ('2025', TRUE);

INSERT INTO terms (academic_year_id, term_number, is_active)
VALUES
((SELECT id FROM academic_years WHERE year_name='2025'), 1, TRUE),
((SELECT id FROM academic_years WHERE year_name='2025'), 2, FALSE),
((SELECT id FROM academic_years WHERE year_name='2025'), 3, FALSE);

INSERT INTO grades (name, level_order) VALUES
('BABY CLASS',1),
('MIDDLE CLASS',2),
('RECEPTION',3),
('GRADE 1',4),
('GRADE 2',5),
('GRADE 3',6),
('GRADE 4',7),
('GRADE 5',8),
('GRADE 6',9),
('GRADE 7',10);

-- ==========================================
-- CLEAN ENROLLMENT FOR 2026 TERM 1
-- ==========================================
-- Optional: remove previous enrollments for Term 1, 2026
DELETE FROM enrollments
WHERE term_id = (
    SELECT id
    FROM terms
    WHERE term_number = 1
      AND academic_year_id = (SELECT id FROM academic_years WHERE year_name='2026')
);

-- ==========================================
-- INSERT ALL PUPILS FOR 2026
-- ==========================================

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
   ('WALUSUNGU JAY BANDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('BENJAMIN KALENGA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('TIMOTHY SIBALWA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('DAVID LUSHOMO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('MUNALE KABWIKU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('FELIX BANDA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('PATRICK MWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('LUIS MUNYI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('THOMAS KALUWA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old'),
  ('ALBERT SAKALA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 6'), 'old');

-- GRADE 7 (14 pupils)
INSERT INTO pupils (full_name, sex, grade_id, status) VALUES
  ('TOMMY CHISANGA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('ELIYAH ZULU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('SAMSON KALUWA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('JOSHUA MUNYI', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('MICHAEL CHISANGA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('DAVID TEMBO', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('PAUL KABWIKU', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('ALBERT MWANZA', 'M', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('NAOMI PHIRI', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('FELICITY BANDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('MARTHA KALOMBO', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('RUTH MWENYA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('JANICE CHIMBWALUME', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old'),
  ('LILIAN SIKALINDA', 'F', (SELECT id FROM grades WHERE name = 'GRADE 7'), 'old');

-- ==========================================
-- CREATE ENROLLMENTS FOR TERM 1, 2026
-- ==========================================
INSERT INTO enrollments (pupil_id, term_id, grade_id, status)
SELECT p.id,
       (SELECT id FROM terms WHERE term_number = 1 AND academic_year_id = (SELECT id FROM academic_years WHERE year_name='2026')),
       p.grade_id,
       p.status
FROM pupils p
WHERE p.id NOT IN (
    SELECT pupil_id FROM enrollments
    WHERE term_id = (SELECT id FROM terms WHERE term_number = 1 AND academic_year_id = (SELECT id FROM academic_years WHERE year_name='2026'))
);

-- ============================
-- 1. Create Other Fee Types Table
-- ============================
CREATE TABLE IF NOT EXISTS other_fee_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC NOT NULL,
    term_applicable INT,
    CONSTRAINT uq_other_fee UNIQUE(name, term_applicable)
);

-- ============================
-- 2. Create Transport Routes Table
-- ============================
CREATE TABLE IF NOT EXISTS transport_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    fee_amount NUMERIC NOT NULL,
    active BOOLEAN DEFAULT false,
    CONSTRAINT uq_route_name UNIQUE(route_name)
);

-- ============================
-- 3. Insert Other Fees
-- ============================
INSERT INTO other_fee_types (name, amount, term_applicable) VALUES
('Maintenance', 250, NULL),
('Registration', 200, NULL),
('Sports Fund', 200, 1),
('Library', 270, 1),
('PTC Funds', 300, 1),
('PTC Funds', 250, 2),
('PTC Funds', 250, 3)
ON CONFLICT ON CONSTRAINT uq_other_fee DO NOTHING;

-- ============================
-- 4. Insert Transport Routes (inactive)
-- ============================
INSERT INTO transport_routes (route_name, region, fee_amount, active) VALUES
-- Northern Route
('Makali/Surya', 'Northern', 500, false),
('Checkpoint/Kalebalika', 'Northern', 500, false),
('Kalabo/Mr Jungle Shop', 'Northern', 550, false),
('Redeemer Road', 'Northern', 500, false),
('Redeemer School', 'Northern', 550, false),
('Oasis Filling Station', 'Northern', 500, false),
('AMS Factory', 'Northern', 550, false),
('Tick Road', 'Northern', 700, false),
('Munsaka Lodge', 'Northern', 550, false),
('PDF', 'Northern', 600, false),
('15 Miles', 'Northern', 600, false),
('Bushland', 'Northern', 700, false),
('Laybye/18 Miles', 'Northern', 750, false),
('Katuba', 'Northern', 800, false),
('Green Roof', 'Northern', 850, false),

-- Southern Route
('Baiton/Karan Garage', 'Southern', 550, false),
('Moomba Area', 'Southern', 500, false),
('Muchenje', 'Southern', 950, false),
('9 Miles', 'Southern', 600, false),
('10 to 10', 'Southern', 550, false),
('Bridge', 'Southern', 650, false),
('Mungule Market', 'Southern', 700, false),
('Savanna Down', 'Southern', 550, false),
('Savanna Up', 'Southern', 550, false),
('Yellow Shop', 'Southern', 600, false),
('Katete', 'Southern', 800, false),
('Mutakwa', 'Southern', 700, false),
('Mai Bbusa', 'Southern', 650, false),
('Malasha', 'Southern', 550, false),
('New Apostollic/layby', 'Southern', 550, false);

DROP TABLE transport_routes CASCADE;

CREATE TABLE transport_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    fee_amount NUMERIC NOT NULL,
    active BOOLEAN DEFAULT false,
    CONSTRAINT uq_route_name UNIQUE(route_name)
);
