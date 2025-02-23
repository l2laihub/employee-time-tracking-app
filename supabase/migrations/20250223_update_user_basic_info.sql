-- Drop all versions of the function
DROP FUNCTION IF EXISTS update_user_basic_info(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS update_user_basic_info(uuid, text, text, text, text, text);

-- Recreate function with photo_url parameter
CREATE OR REPLACE FUNCTION update_user_basic_info(
  employee_id uuid,
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_email text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_photo_url text DEFAULT NULL
)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_employee employees%ROWTYPE;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get the target employee record
  SELECT * INTO target_employee
  FROM employees e
  INNER JOIN organization_members om ON e.member_id = om.id
  WHERE e.id = employee_id;
  
  -- Check if employee exists
  IF target_employee.id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  -- Check if current user is the owner of this employee record
  IF NOT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.id = target_employee.member_id
    AND om.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: Users can only update their own information';
  END IF;

  -- Update employee record
  UPDATE employees
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    photo_url = new_photo_url,
    updated_at = NOW()
  WHERE id = employee_id
  RETURNING * INTO target_employee;

  RETURN NEXT target_employee;
END;
$$;