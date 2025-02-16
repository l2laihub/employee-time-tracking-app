-- Add policy to allow employees to update their own PTO settings
CREATE POLICY "Employees can update their own PTO settings"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
        -- Allow employees to update their own PTO settings
        member_id IN (
            SELECT id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Only allow updating PTO settings
        member_id IN (
            SELECT id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Create a trigger to ensure only PTO settings can be updated
CREATE OR REPLACE FUNCTION check_employee_pto_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure only PTO field is being updated
    IF NEW.first_name != OLD.first_name OR
       NEW.last_name != OLD.last_name OR
       NEW.email != OLD.email OR
       COALESCE(NEW.phone, '') != COALESCE(OLD.phone, '') OR
       NEW.role != OLD.role OR
       COALESCE(NEW.department, '') != COALESCE(OLD.department, '') OR
       NEW.start_date != OLD.start_date OR
       NEW.status != OLD.status OR
       NEW.organization_id != OLD.organization_id OR
       NEW.member_id != OLD.member_id THEN
        RAISE EXCEPTION 'Only PTO settings can be updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS check_employee_pto_update_trigger ON employees;
CREATE TRIGGER check_employee_pto_update_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION check_employee_pto_update();

-- Create a function to update employee PTO settings
CREATE OR REPLACE FUNCTION update_employee_pto(
    employee_id UUID,
    new_pto JSONB
)
RETURNS SETOF public.employees
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- First check if employee exists
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
    ) THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    -- Then check if user has permission (either admin or the employee themselves)
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND (
            -- Admin can update any employee's PTO
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
            OR
            -- Employee can update their own PTO
            e.member_id IN (
                SELECT id
                FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only admins or the employee themselves can update PTO settings';
    END IF;

    -- Update and return the updated record
    RETURN QUERY
    UPDATE public.employees
    SET
        pto = new_pto,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = employee_id
    RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_employee_pto TO authenticated;
