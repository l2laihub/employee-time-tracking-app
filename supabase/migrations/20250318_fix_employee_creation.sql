-- Update the accept_organization_invite function to create an employee record
CREATE OR REPLACE FUNCTION accept_organization_invite(
  p_invite_id uuid,
  p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user record;
  v_user_metadata json;
  v_result json;
  v_first_name text;
  v_last_name text;
  v_member_id uuid;
BEGIN
  -- Get invite details
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE id = p_invite_id
  AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found or already used'
    );
  END IF;

  -- Check if invite is expired
  IF v_invite.expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite has expired'
    );
  END IF;

  -- Get user details
  SELECT email, raw_user_meta_data INTO v_user
  FROM auth.users
  WHERE id = p_user_id;

  -- Verify email matches invite
  IF v_user.email != v_invite.email THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email does not match invite'
    );
  END IF;

  -- Extract first and last name from user metadata
  v_user_metadata := v_user.raw_user_meta_data;
  v_first_name := v_user_metadata->>'first_name';
  v_last_name := v_user_metadata->>'last_name';

  -- Create organization membership
  INSERT INTO organization_members (
    user_id,
    organization_id,
    role
  ) VALUES (
    p_user_id,
    v_invite.organization_id,
    v_invite.role
  )
  ON CONFLICT (user_id, organization_id) DO NOTHING
  RETURNING id INTO v_member_id;
  
  -- If no new record was inserted, get the existing member_id
  IF v_member_id IS NULL THEN
    SELECT id INTO v_member_id
    FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = v_invite.organization_id;
  END IF;

  -- Check if employee already exists
  DECLARE
    v_employee_exists boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM employees
      WHERE email = v_user.email
    ) INTO v_employee_exists;
    
    -- Only create employee if doesn't exist
    IF NOT v_employee_exists THEN
      -- Create employee record
      INSERT INTO employees (
        organization_id,
        member_id,
        first_name,
        last_name,
        email,
        status,
        role,
        start_date,
        pto
      ) VALUES (
        v_invite.organization_id,
        v_member_id,
        COALESCE(v_first_name, ''),
        COALESCE(v_last_name, ''),
        v_user.email,
        'active',
        v_invite.role,
        CURRENT_DATE,
        jsonb_build_object(
          'vacation', jsonb_build_object(
            'beginningBalance', 0,
            'accrualRate', 6.67,
            'accrued', 0,
            'used', 0,
            'pending', 0,
            'carryover', 0
          ),
          'sick', jsonb_build_object(
            'beginningBalance', 0,
            'accrualRate', 3.33,
            'accrued', 0,
            'used', 0,
            'pending', 0,
            'carryover', 0
          )
        )
      );
    END IF;
  END;

  -- Update invite status
  UPDATE organization_invites
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id
  WHERE id = p_invite_id;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id
  );
END;
$$;
