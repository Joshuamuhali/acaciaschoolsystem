-- ==========================================
-- UPDATE SCHOOL FEE TYPES - CORRECT FEES
-- ==========================================
-- Purpose: Update other_fee_types table with correct school fees
-- Run this after running the complete-school-schema-2026.sql

-- First, clear existing fee types
DELETE FROM other_fee_types;

-- Insert the correct fee types
INSERT INTO other_fee_types (name, amount, term_applicable) VALUES
('Maintenance', 250, NULL),
('Registration', 200, NULL),
('Sports Fund', 200, 1),
('Library', 270, 1),
('PTC Funds', 300, 1),
('PTC Funds', 250, 2),
('PTC Funds', 250, 3),
('Lunch', 1200, NULL);

-- Verify the fees are correct
SELECT name, amount, term_applicable
FROM other_fee_types
ORDER BY name, term_applicable;

-- ==========================================
-- TRANSPORT ROUTES SETUP
-- ==========================================

-- Clear existing transport routes
DELETE FROM transport_routes;

-- Insert transport routes
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

-- ==========================================
-- NOTES
-- ==========================================
-- After running this script, the fee assignment system should show:
-- • Maintenance: ZMW 250 (all terms)
-- • Registration: ZMW 200 (all terms)
-- • Sports Fund: ZMW 200 (term 1 only)
-- • Library: ZMW 270 (term 1 only)
-- • PTC Funds: ZMW 300 (term 1), ZMW 250 (term 2), ZMW 250 (term 3)
-- • Lunch: ZMW 1,200 (all terms)
--
-- Transport routes will be available but inactive by default.
