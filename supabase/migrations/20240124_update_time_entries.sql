-- First, drop any existing foreign key constraints
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

-- Add break_duration column
ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS break_duration INTEGER;

-- Make sure all columns have correct nullability
ALTER TABLE time_entries
    ALTER COLUMN organization_id SET NOT NULL,
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN start_time SET NOT NULL,
    ALTER COLUMN end_time DROP NOT NULL,
    ALTER COLUMN job_location_id SET NOT NULL;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_organization ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_location ON time_entries(job_location_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);

-- Add RLS (Row Level Security) policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
    DROP POLICY IF EXISTS "Users can manage their own time entries" ON time_entries;
    DROP POLICY IF EXISTS "Managers can manage team time entries" ON time_entries;
END $$;

-- Policy for users to view their own time entries and managers to view their team's entries
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM organization_members om1, organization_members om2
            WHERE om1.user_id = auth.uid()
            AND om2.user_id = time_entries.user_id
            AND om1.organization_id = om2.organization_id
            AND om1.role IN ('admin', 'manager')
        )
    );

-- Policy for users to manage their own time entries
CREATE POLICY "Users can manage their own time entries" ON time_entries
    FOR ALL
    USING (user_id = auth.uid());

-- Policy for managers to manage their team's time entries
CREATE POLICY "Managers can manage team time entries" ON time_entries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om1, organization_members om2
            WHERE om1.user_id = auth.uid()
            AND om2.user_id = time_entries.user_id
            AND om1.organization_id = om2.organization_id
            AND om1.role IN ('admin', 'manager')
        )
    );

-- Add foreign key constraint back
ALTER TABLE time_entries
    ADD CONSTRAINT time_entries_job_location_id_fkey 
    FOREIGN KEY (job_location_id) 
    REFERENCES job_locations(id)
    ON DELETE RESTRICT;

-- Add trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE time_entries IS 'Stores employee time entries for work performed at job locations';
COMMENT ON COLUMN time_entries.break_duration IS 'Duration of break in minutes';
COMMENT ON COLUMN time_entries.end_time IS 'Can be null for ongoing time entries';
COMMENT ON COLUMN time_entries.notes IS 'Optional notes about the work performed';
