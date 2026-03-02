-- =====================================================
-- PARENTS TABLE SCHEMA
-- =====================================================

-- Create parents table
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    occupation VARCHAR(255),
    emergency_contact VARCHAR(50),
    relationship_to_pupil VARCHAR(50) DEFAULT 'Parent',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT parents_phone_unique UNIQUE(phone),
    CONSTRAINT parents_email_unique UNIQUE(email) WHERE email IS NOT NULL,
    CONSTRAINT parents_relationship_check CHECK (relationship_to_pupil IN ('Parent', 'Guardian', 'Relative', 'Other'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parents_phone ON parents(phone);
CREATE INDEX IF NOT EXISTS idx_parents_full_name ON parents(full_name);
CREATE INDEX IF NOT EXISTS idx_parents_active ON parents(is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parents_updated_at 
    BEFORE UPDATE ON parents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create pupil_parent relationship table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS pupil_parent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'Parent',
    is_primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT pupil_parent_unique UNIQUE(pupil_id, parent_id),
    CONSTRAINT relationship_type_check CHECK (relationship_type IN ('Parent', 'Guardian', 'Relative', 'Other'))
);

-- Create indexes for relationship table
CREATE INDEX IF NOT EXISTS idx_pupil_parent_pupil ON pupil_parent_relationships(pupil_id);
CREATE INDEX IF NOT EXISTS idx_pupil_parent_parent ON pupil_parent_relationships(parent_id);

-- Function to migrate existing parent data from pupils table
CREATE OR REPLACE FUNCTION migrate_parent_data()
RETURNS VOID AS $$
DECLARE
    pupil_record RECORD;
    parent_id UUID;
BEGIN
    -- Create a temporary table to track processed parents
    DROP TABLE IF EXISTS temp_processed_parents;
    CREATE TEMP TABLE temp_processed_parents (
        parent_name VARCHAR(255),
        parent_phone VARCHAR(50),
        processed BOOLEAN DEFAULT FALSE
    );
    
    -- Iterate through pupils with parent information
    FOR pupil_record IN 
        SELECT DISTINCT parent_name, parent_phone 
        FROM pupils 
        WHERE parent_name IS NOT NULL 
        AND parent_phone IS NOT NULL
    LOOP
        -- Check if we've already processed this parent
        IF NOT EXISTS (
            SELECT 1 FROM temp_processed_parents 
            WHERE parent_name = pupil_record.parent_name 
            AND parent_phone = pupil_record.parent_phone
        ) THEN
            -- Insert parent into parents table
            INSERT INTO parents (full_name, phone, relationship_to_pupil)
            VALUES (pupil_record.parent_name, pupil_record.parent_phone, 'Parent')
            ON CONFLICT (phone) DO NOTHING
            RETURNING id INTO parent_id;
            
            -- Get the parent ID (either from insert or existing)
            SELECT id INTO parent_id FROM parents WHERE phone = pupil_record.parent_phone;
            
            -- Link all pupils with this parent to the parent record
            INSERT INTO pupil_parent_relationships (pupil_id, parent_id, relationship_type, is_primary_contact)
            SELECT p.id, parent_id, 'Parent', TRUE
            FROM pupils p
            WHERE p.parent_name = pupil_record.parent_name 
            AND p.parent_phone = pupil_record.parent_phone
            ON CONFLICT (pupil_id, parent_id) DO NOTHING;
            
            -- Mark as processed
            INSERT INTO temp_processed_parents (parent_name, parent_phone, processed)
            VALUES (pupil_record.parent_name, pupil_record.parent_phone, TRUE);
        END IF;
    END LOOP;
    
    -- Clean up temp table
    DROP TABLE IF EXISTS temp_processed_parents;
END;
$$ LANGUAGE plpgsql;

-- Run migration (comment this out after running once)
-- SELECT migrate_parent_data();

-- View for parent-pupil relationships
CREATE OR REPLACE VIEW parent_pupil_view AS
SELECT 
    p.id as parent_id,
    p.full_name as parent_name,
    p.phone as parent_phone,
    p.email as parent_email,
    p.address as parent_address,
    p.occupation as parent_occupation,
    p.emergency_contact as parent_emergency_contact,
    p.relationship_to_pupil as parent_relationship_type,
    p.is_active as parent_is_active,
    p.created_at as parent_created_at,
    pu.id as pupil_id,
    pu.full_name as pupil_name,
    pu.grade_id,
    g.name as grade_name,
    ppr.relationship_type as relationship_type,
    ppr.is_primary_contact,
    ppr.created_at as relationship_created_at
FROM parents p
LEFT JOIN pupil_parent_relationships ppr ON p.id = ppr.parent_id
LEFT JOIN pupils pu ON ppr.pupil_id = pu.id
LEFT JOIN grades g ON pu.grade_id = g.id
WHERE p.is_active = TRUE
ORDER BY p.full_name, pu.full_name;
