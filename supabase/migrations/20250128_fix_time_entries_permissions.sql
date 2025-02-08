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

-- Create helper function to check RLS condition
CREATE OR REPLACE FUNCTION check_time_entry_access(p_employee_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_result boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM employees e
        JOIN organization_members om ON e.member_id = om.id
        WHERE e.id = p_employee_id
        AND om.user_id = p_user_id
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_time_entry_access TO authenticated;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON time_entries;

-- Re-apply RLS policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT
    USING (
        -- Allow if the time entry belongs to an employee record linked to the current user
        EXISTS (
            SELECT 1 FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = time_entries.employee_id
            AND om.user_id = auth.uid()
        )
        OR 
        -- Or if the user is an admin in the organization
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = time_entries.organization_id 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own time entries" ON time_entries
    FOR INSERT
    WITH CHECK (
        -- Allow if the time entry is for an employee record linked to the current user
        check_time_entry_access(employee_id, auth.uid())
    );

-- Add explicit comments to help PostgREST
COMMENT ON TABLE time_entries IS 'Table for storing employee time entries';
COMMENT ON COLUMN time_entries.start_time IS 'Time when employee started work';
COMMENT ON COLUMN time_entries.end_time IS 'Time when employee ended work';
COMMENT ON COLUMN time_entries.notes IS 'Work description or notes';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
