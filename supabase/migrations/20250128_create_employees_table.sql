-- Drop existing table if it exists
DROP TABLE IF EXISTS public.employees CASCADE;

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    member_id UUID REFERENCES organization_members(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    department TEXT,
    start_date DATE NOT NULL,
    pto JSONB DEFAULT '{
        "vacation": {
            "beginningBalance": 0,
            "ongoingBalance": 0,
            "firstYearRule": 40,
            "used": 0
        },
        "sickLeave": {
            "beginningBalance": 0,
            "used": 0
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_member_id ON public.employees(member_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Add RLS policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy to allow organizations to read their own employees
CREATE POLICY "Organizations can view their own employees"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy to allow organizations to insert their own employees
CREATE POLICY "Organizations can insert their own employees"
    ON public.employees
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin')
        )
    );

-- Policy to allow organizations to update their own employees
CREATE POLICY "Organizations can update their own employees"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin')
        )
    );

-- Policy to allow organizations to delete their own employees
CREATE POLICY "Organizations can delete their own employees"
    ON public.employees
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
