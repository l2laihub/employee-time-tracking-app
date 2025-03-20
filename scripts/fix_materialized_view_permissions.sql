-- Script to fix the "must be owner of materialized view admin_members" permission error
-- This script provides multiple approaches to resolve the issue

-- APPROACH 1: Grant permissions on the materialized view
-- This grants the necessary permissions to the authenticated and anon roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'admin_members'
  ) THEN
    -- Grant permissions to the materialized view
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON admin_members TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON admin_members TO anon';
    
    -- Grant permissions to the sequence if it exists
    IF EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'admin_members_id_seq' AND relkind = 'S'
    ) THEN
      EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE admin_members_id_seq TO authenticated';
      EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE admin_members_id_seq TO anon';
    END IF;
  END IF;
END
$$;

-- APPROACH 2: Create a bypass function with SECURITY DEFINER
-- This function will run with the privileges of the function creator (superuser)
CREATE OR REPLACE FUNCTION bypass_create_organization_member(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'admin'
) RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
BEGIN
  -- Direct insert into organization_members table
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, p_role)
  RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the bypass function
GRANT EXECUTE ON FUNCTION bypass_create_organization_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_create_organization_member(UUID, UUID, TEXT) TO anon;

-- APPROACH 3: Create a complete organization setup function that bypasses all views
CREATE OR REPLACE FUNCTION bypass_create_complete_organization(
  p_org_name TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT ''
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
  
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, v_slug)
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

-- Grant execute permissions on the complete bypass function
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;

-- APPROACH 3B: Create a complete organization setup function with custom departments and service types
CREATE OR REPLACE FUNCTION bypass_create_complete_organization_with_custom(
  p_org_name TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_departments TEXT[] DEFAULT NULL,
  p_service_types TEXT[] DEFAULT NULL
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
  
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, v_slug)
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

-- Grant execute permissions on the complete bypass function with custom departments and service types
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization_with_custom(TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_create_complete_organization_with_custom(TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT[]) TO anon;

-- APPROACH 4: Temporarily disable RLS for testing
-- WARNING: This should only be used for testing and should be re-enabled in production
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- APPROACH 5: Drop and recreate the materialized view (if possible)
-- WARNING: This will drop the materialized view and recreate it
-- This should only be done if you have the schema definition for the view
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'admin_members'
  ) THEN
    DROP MATERIALIZED VIEW admin_members;
    
    -- Recreate the materialized view with the correct definition
    -- You need to replace this with the actual definition of the view
    CREATE MATERIALIZED VIEW admin_members AS
    SELECT 
      om.id,
      om.organization_id,
      om.user_id,
      om.role,
      om.created_at,
      om.updated_at
    FROM organization_members om
    WHERE om.role = 'admin';
    
    -- Grant permissions on the recreated view
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin_members TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin_members TO anon;
  END IF;
END
$$;
*/