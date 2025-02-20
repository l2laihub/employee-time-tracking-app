-- Create function to update employee basic info
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

-- Create function to update user basic info (limited fields)
CREATE OR REPLACE FUNCTION public.update_user_basic_info(
  employee_id uuid,
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_email text DEFAULT NULL,
  new_phone text DEFAULT NULL
)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the employee record with non-null values
  -- This function only allows updating basic user information
  RETURN QUERY
  UPDATE employees
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    updated_at = NOW()
  WHERE id = employee_id
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_basic_info TO authenticated;