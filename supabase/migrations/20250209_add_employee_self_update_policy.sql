-- Drop existing objects if they exist
DROP POLICY IF EXISTS "Users can update their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Users can update their own employee basic info" ON public.employees;
DROP FUNCTION IF EXISTS update_employee_basic_info;

-- Create a function to update employee basic info
CREATE OR REPLACE FUNCTION update_employee_basic_info(
    employee_id uuid,
    new_first_name text DEFAULT NULL,
    new_last_name text DEFAULT NULL,
    new_email text DEFAULT NULL,
    new_phone text DEFAULT NULL
)
RETURNS SETOF employees
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    target_employee employees%ROWTYPE;
BEGIN
    -- Get the employee record
    SELECT * INTO target_employee
    FROM employees
    WHERE id = employee_id
    AND member_id IN (
        SELECT id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    );

    -- If no employee found or not authorized, return empty
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Update and return the updated record
    RETURN QUERY
    UPDATE employees
    SET
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        email = COALESCE(new_email, email),
        phone = COALESCE(new_phone, phone)
    WHERE id = employee_id
    AND member_id = target_employee.member_id
    AND organization_id = target_employee.organization_id
    RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_employee_basic_info TO authenticated;

-- Add policy to allow users to read their own employee record
CREATE POLICY "Users can view their own employee record"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );
