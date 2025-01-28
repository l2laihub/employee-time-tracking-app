-- Drop existing table if it exists
DROP TABLE IF EXISTS time_entries CASCADE;

-- Create time_entries table
CREATE TABLE time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_location_id UUID NOT NULL REFERENCES job_locations(id),
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    total_break_minutes INTEGER DEFAULT 0,
    service_type TEXT NOT NULL CHECK (service_type IN ('hvac', 'plumbing', 'both')),
    work_description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'break', 'completed')),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT valid_break_times CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    ),
    CONSTRAINT valid_clock_times CHECK (
        (clock_out IS NULL) OR
        (clock_out > clock_in)
    )
);

-- Add RLS policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own time entries and organization admins to view all entries
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

-- Policy for users to create their own time entries
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

-- Policy for users to update their own active time entries
CREATE POLICY "Users can update their own active time entries" ON time_entries
    FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        (status = 'active' OR status = 'break')
    )
    WITH CHECK (
        auth.uid() = user_id AND 
        (status = 'active' OR status = 'break')
    );

-- Add indexes for common queries
CREATE INDEX time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX time_entries_organization_id_idx ON time_entries(organization_id);
CREATE INDEX time_entries_clock_in_idx ON time_entries(clock_in);
CREATE INDEX time_entries_status_idx ON time_entries(status);

-- Add trigger for updated_at
CREATE TRIGGER set_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
