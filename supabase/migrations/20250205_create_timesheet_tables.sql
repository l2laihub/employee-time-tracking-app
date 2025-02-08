-- Drop existing tables if they exist
DROP TABLE IF EXISTS timesheets CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;

-- Create set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timesheets table
CREATE TABLE timesheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    total_hours DECIMAL(10,2) DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT timesheet_dates_check CHECK (period_end_date >= period_start_date),
    CONSTRAINT timesheet_period_unique UNIQUE(employee_id, period_start_date)
);

-- Create time entries table
CREATE TABLE time_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    job_location_id UUID REFERENCES job_locations(id) NOT NULL,
    entry_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT time_entry_dates_check CHECK (end_time IS NULL OR end_time > start_time)
);

-- Create function to calculate hours between timestamps
CREATE OR REPLACE FUNCTION calculate_hours(
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
    IF end_time IS NULL THEN
        RETURN 0;
    END IF;
    RETURN ROUND(
        (EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_duration::decimal/60))::decimal,
        2
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to update timesheet totals
CREATE OR REPLACE FUNCTION update_timesheet_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update relevant timesheet total
    UPDATE timesheets
    SET total_hours = (
        SELECT COALESCE(SUM(
            calculate_hours(start_time, end_time, break_duration)
        ), 0)
        FROM time_entries
        WHERE employee_id = NEW.employee_id
        AND entry_date BETWEEN timesheets.period_start_date AND timesheets.period_end_date
    )
    WHERE employee_id = NEW.employee_id
    AND period_start_date <= NEW.entry_date
    AND period_end_date >= NEW.entry_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_timesheet_updated_at
    BEFORE UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_time_entry_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Create triggers for updating timesheet totals
CREATE TRIGGER update_timesheet_totals_on_insert
    AFTER INSERT ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheet_totals();

CREATE TRIGGER update_timesheet_totals_on_update
    AFTER UPDATE OF start_time, end_time, break_duration ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheet_totals();

-- Add RLS policies
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Timesheet policies
CREATE POLICY "Users can view their own timesheets"
    ON timesheets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can view all timesheets"
    ON timesheets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = timesheets.organization_id
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can create their own timesheets"
    ON timesheets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their draft timesheets"
    ON timesheets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
        AND status = 'draft'
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
        AND status = 'draft'
    );

CREATE POLICY "Organization admins can update any timesheet"
    ON timesheets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = timesheets.organization_id
            AND role = 'admin'
        )
    );

-- Time entry policies
CREATE POLICY "Users can view their own time entries"
    ON time_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can view all time entries"
    ON time_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = time_entries.organization_id
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can create their own time entries"
    ON time_entries
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own time entries"
    ON time_entries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );