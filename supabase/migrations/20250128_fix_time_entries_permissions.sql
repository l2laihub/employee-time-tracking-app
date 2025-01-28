-- Grant explicit permissions to the authenticator role (used by PostgREST)
GRANT ALL ON time_entries TO authenticated;
GRANT ALL ON time_entries TO service_role;

-- Grant usage on the sequence if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'time_entries_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO authenticated;
        GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO service_role;
    END IF;
END $$;

-- Ensure the schema is in the search_path
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON time_entries;

-- Re-apply RLS policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = time_entries.organization_id 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can create their own time entries" ON time_entries
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = time_entries.organization_id
        )
    );

-- Add explicit comments to help PostgREST
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'start_time'
    ) THEN
        COMMENT ON TABLE time_entries IS 'Table for storing employee time entries';
        COMMENT ON COLUMN time_entries.start_time IS 'Time when employee started work';
        COMMENT ON COLUMN time_entries.end_time IS 'Time when employee ended work';
        COMMENT ON COLUMN time_entries.notes IS 'Work description or notes';
        COMMENT ON COLUMN time_entries.status IS 'Current status of the time entry (active, break, completed)';
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
