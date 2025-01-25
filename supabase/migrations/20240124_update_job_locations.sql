-- Drop existing foreign key constraints if any
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_entries_job_location_id_fkey'
    ) THEN
        ALTER TABLE time_entries DROP CONSTRAINT time_entries_job_location_id_fkey;
    END IF;
END $$;

-- Drop the existing table
DROP TABLE IF EXISTS job_locations;

-- Create new job_locations table with updated schema
CREATE TABLE job_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('commercial', 'residential')),
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('hvac', 'plumbing', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_job_locations_organization ON job_locations(organization_id);
CREATE INDEX idx_job_locations_type ON job_locations(type);
CREATE INDEX idx_job_locations_service_type ON job_locations(service_type);
CREATE INDEX idx_job_locations_is_active ON job_locations(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE job_locations ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their job locations
CREATE POLICY "Organization members can view job locations" ON job_locations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for organization admins to manage job locations
CREATE POLICY "Organization admins can manage job locations" ON job_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = job_locations.organization_id
            AND role = 'admin'
        )
    );

-- Update time_entries foreign key
ALTER TABLE time_entries
    ADD CONSTRAINT time_entries_job_location_id_fkey 
    FOREIGN KEY (job_location_id) 
    REFERENCES job_locations(id)
    ON DELETE RESTRICT;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on job_locations
CREATE TRIGGER update_job_locations_updated_at
    BEFORE UPDATE ON job_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment on table and columns for better documentation
COMMENT ON TABLE job_locations IS 'Stores information about job locations/sites where work is performed';
COMMENT ON COLUMN job_locations.type IS 'Type of location: commercial or residential';
COMMENT ON COLUMN job_locations.service_type IS 'Type of service provided at this location: hvac, plumbing, or both';
COMMENT ON COLUMN job_locations.is_active IS 'Whether this location is currently active and available for time entries';
