-- Drop the trigger that's preventing non-PTO updates
DROP TRIGGER IF EXISTS check_employee_pto_update_trigger ON employees;
DROP FUNCTION IF EXISTS check_employee_pto_update();

-- Update the employee update policy to allow managers
DROP POLICY IF EXISTS "Organizations can update their own employees" ON public.employees;
CREATE POLICY "Organizations can update their own employees"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Update function to include permission checks
CREATE OR REPLACE FUNCTION public.update_employee_basic_info(
  employee_id uuid,
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_email text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_department text DEFAULT NULL,
  new_start_date date DEFAULT NULL,
  new_role text DEFAULT NULL,
  new_status text DEFAULT NULL,
  new_pto jsonb DEFAULT NULL
)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has permission (admin or manager)
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND (
            -- Admin can update any employee
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
            OR
            -- Manager can update organization employees
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'manager'
            )
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only admins or managers can update employee information';
    END IF;

    -- Update the employee record with non-null values
    RETURN QUERY
    UPDATE employees
    SET
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        email = COALESCE(new_email, email),
        phone = COALESCE(new_phone, phone),
        department = COALESCE(new_department, department),
        start_date = COALESCE(new_start_date, start_date),
        role = COALESCE(new_role, role),
        status = COALESCE(new_status, status),
        pto = COALESCE(new_pto, pto),
        updated_at = NOW()
    WHERE id = employee_id
    RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_employee_basic_info TO authenticated;