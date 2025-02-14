-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_employee_basic_info(uuid,text,text,text,text);
DROP FUNCTION IF EXISTS update_employee_basic_info(uuid,text,text,text,text,text,date);
DROP FUNCTION IF EXISTS update_employee_basic_info(uuid,text,text,text,text,text,date,jsonb);

-- Function to update employee basic info
CREATE OR REPLACE FUNCTION update_employee_basic_info(
  employee_id UUID,
  new_first_name TEXT,
  new_last_name TEXT,
  new_email TEXT,
  new_phone TEXT,
  new_department TEXT,
  new_start_date DATE,
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

  -- Then check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin')
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only admins can update employee records';
  END IF;

  -- Update and return the updated record
  RETURN QUERY
  UPDATE public.employees
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone = new_phone,
    department = COALESCE(new_department, department),
    start_date = COALESCE(new_start_date, start_date),
    updated_at = TIMEZONE('utc', NOW()),
    pto = COALESCE(new_pto, pto)
  WHERE id = employee_id
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_employee_basic_info TO authenticated;
