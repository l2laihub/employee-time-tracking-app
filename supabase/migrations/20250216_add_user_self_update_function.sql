-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_user_basic_info(uuid,text,text,text,text);

-- Function to allow users to update their own basic info
CREATE OR REPLACE FUNCTION update_user_basic_info(
  employee_id UUID,
  new_first_name TEXT,
  new_last_name TEXT,
  new_email TEXT,
  new_phone TEXT
)
RETURNS SETOF public.employees
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is updating their own record
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.member_id IN (
      SELECT id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: Users can only update their own records';
  END IF;

  -- Update and return the updated record
  RETURN QUERY
  UPDATE public.employees
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone = new_phone,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = employee_id
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_basic_info TO authenticated;