-- Function to create an organization and member in one transaction
-- This bypasses RLS policies and is meant to be used during onboarding
CREATE OR REPLACE FUNCTION public.create_organization_simple(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT ''
) RETURNS TABLE (
  organization_id UUID,
  member_id UUID,
  employee_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_organization_id UUID;
  v_member_id UUID;
  v_employee_id UUID;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  -- Check if user already has an organization membership
  SELECT om.organization_id, om.id INTO v_organization_id, v_member_id
  FROM organization_members om
  WHERE om.user_id = p_user_id
  LIMIT 1;
  
  IF FOUND THEN
    -- User already has an organization, check if they have an employee record
    SELECT id INTO v_employee_id
    FROM employees
    WHERE member_id = v_member_id AND organization_id = v_organization_id
    LIMIT 1;
    
    -- Return existing IDs
    RETURN QUERY SELECT v_organization_id, v_member_id, v_employee_id;
    RETURN;
  END IF;

  -- Create new organization
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_organization_id;
  
  -- Create organization member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_organization_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Create employee record
  INSERT INTO employees (
    organization_id,
    member_id,
    first_name,
    last_name,
    email,
    role,
    start_date,
    status,
    pto
  )
  VALUES (
    v_organization_id,
    v_member_id,
    p_first_name,
    p_last_name,
    p_user_email,
    'admin',
    v_current_date,
    'active',
    jsonb_build_object(
      'vacation', jsonb_build_object(
        'beginningBalance', 0,
        'ongoingBalance', 0,
        'firstYearRule', 40,
        'used', 0
      ),
      'sickLeave', jsonb_build_object(
        'beginningBalance', 0,
        'used', 0
      )
    )
  )
  RETURNING id INTO v_employee_id;
  
  -- Create default departments
  INSERT INTO departments (name, organization_id)
  VALUES 
    ('Administration', v_organization_id),
    ('Field Operations', v_organization_id),
    ('Sales', v_organization_id);
    
  -- Create default service types
  INSERT INTO service_types (name, organization_id)
  VALUES 
    ('Consulting', v_organization_id),
    ('Maintenance', v_organization_id),
    ('Installation', v_organization_id);
  
  -- Return the created IDs
  RETURN QUERY SELECT v_organization_id, v_member_id, v_employee_id;
END;
$$;
