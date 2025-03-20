-- Script to update the bypass functions to accept settings and branding parameters

-- Update the bypass_create_complete_organization function
DROP FUNCTION IF EXISTS bypass_create_complete_organization(TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION bypass_create_complete_organization(
  p_org_name TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_settings JSONB DEFAULT NULL,
  p_branding JSONB DEFAULT NULL
) RETURNS TABLE (
  organization_id UUID,
  member_id UUID,
  employee_id UUID
) AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
  v_employee_id UUID;
  v_timestamp BIGINT;
  v_slug TEXT;
BEGIN
  -- Generate a unique slug with timestamp
  v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_slug := LOWER(REGEXP_REPLACE(p_org_name, '[^a-z0-9]', '-', 'g')) || '-' || v_timestamp::TEXT;
  
  -- Create organization with settings and branding
  INSERT INTO organizations (
    name, 
    slug, 
    settings,
    branding
  )
  VALUES (
    p_org_name, 
    v_slug,
    COALESCE(p_settings, '{}'::jsonb),
    COALESCE(p_branding, '{
      "primary_color": "#3b82f6",
      "secondary_color": "#1e40af",
      "logo_url": null,
      "favicon_url": null,
      "company_name": null,
      "company_website": null
    }'::jsonb)
  )
  RETURNING id INTO v_org_id;
  
  -- Create organization member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Create employee if email is provided
  IF p_user_email IS NOT NULL THEN
    INSERT INTO employees (
      member_id,
      organization_id,
      first_name,
      last_name,
      email,
      status,
      role,
      start_date,
      pto
    )
    VALUES (
      v_member_id,
      v_org_id,
      p_first_name,
      p_last_name,
      p_user_email,
      'active',
      'admin',
      CURRENT_DATE,
      '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 0}, "sickLeave": {"beginningBalance": 0, "used": 0}}'::jsonb
    )
    RETURNING id INTO v_employee_id;
  END IF;
  
  -- Create default departments
  INSERT INTO departments (name, organization_id)
  VALUES 
    ('Administration', v_org_id),
    ('Field Operations', v_org_id),
    ('Sales', v_org_id);
  
  -- Create default service types
  INSERT INTO service_types (name, organization_id)
  VALUES 
    ('Standard', v_org_id),
    ('Premium', v_org_id);
  
  RETURN QUERY SELECT v_org_id, v_member_id, v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the updated bypass function
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization(TEXT, UUID, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization(TEXT, UUID, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon;

-- Update the bypass_create_complete_organization_with_custom function
DROP FUNCTION IF EXISTS bypass_create_complete_organization_with_custom(TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION bypass_create_complete_organization_with_custom(
  p_org_name TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_departments TEXT[] DEFAULT NULL,
  p_service_types TEXT[] DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_branding JSONB DEFAULT NULL
) RETURNS TABLE (
  organization_id UUID,
  member_id UUID,
  employee_id UUID
) AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
  v_employee_id UUID;
  v_timestamp BIGINT;
  v_slug TEXT;
  v_dept TEXT;
  v_service TEXT;
BEGIN
  -- Generate a unique slug with timestamp
  v_timestamp := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_slug := LOWER(REGEXP_REPLACE(p_org_name, '[^a-z0-9]', '-', 'g')) || '-' || v_timestamp::TEXT;
  
  -- Create organization with settings and branding
  INSERT INTO organizations (
    name, 
    slug, 
    settings,
    branding
  )
  VALUES (
    p_org_name, 
    v_slug,
    COALESCE(p_settings, '{}'::jsonb),
    COALESCE(p_branding, '{
      "primary_color": "#3b82f6",
      "secondary_color": "#1e40af",
      "logo_url": null,
      "favicon_url": null,
      "company_name": null,
      "company_website": null
    }'::jsonb)
  )
  RETURNING id INTO v_org_id;
  
  -- Create organization member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Create employee if email is provided
  IF p_user_email IS NOT NULL THEN
    INSERT INTO employees (
      member_id,
      organization_id,
      first_name,
      last_name,
      email,
      status,
      role,
      start_date,
      pto
    )
    VALUES (
      v_member_id,
      v_org_id,
      p_first_name,
      p_last_name,
      p_user_email,
      'active',
      'admin',
      CURRENT_DATE,
      '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 0}, "sickLeave": {"beginningBalance": 0, "used": 0}}'::jsonb
    )
    RETURNING id INTO v_employee_id;
  END IF;
  
  -- Create departments
  IF p_departments IS NOT NULL AND array_length(p_departments, 1) > 0 THEN
    -- Create custom departments
    FOREACH v_dept IN ARRAY p_departments
    LOOP
      INSERT INTO departments (name, organization_id)
      VALUES (v_dept, v_org_id);
    END LOOP;
  ELSE
    -- Create default departments
    INSERT INTO departments (name, organization_id)
    VALUES 
      ('Administration', v_org_id),
      ('Field Operations', v_org_id),
      ('Sales', v_org_id);
  END IF;
  
  -- Create service types
  IF p_service_types IS NOT NULL AND array_length(p_service_types, 1) > 0 THEN
    -- Create custom service types
    FOREACH v_service IN ARRAY p_service_types
    LOOP
      INSERT INTO service_types (name, organization_id)
      VALUES (v_service, v_org_id);
    END LOOP;
  ELSE
    -- Create default service types
    INSERT INTO service_types (name, organization_id)
    VALUES 
      ('Standard', v_org_id),
      ('Premium', v_org_id);
  END IF;
  
  RETURN QUERY SELECT v_org_id, v_member_id, v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the updated bypass function with custom departments and service types
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization_with_custom(TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT[], JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization_with_custom(TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT[], JSONB, JSONB) TO anon;