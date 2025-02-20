-- Update the function to allow managers to update employee PTO
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

    -- Then check if user has permission (admin, manager, or the employee themselves)
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
            -- Manager can update their organization's employee PTO
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'manager'
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
        RAISE EXCEPTION 'Permission denied: Only admins, managers, or the employee themselves can update PTO settings';
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