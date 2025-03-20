-- Script to fix organization records and prevent duplicate issues
-- This script will clean up existing duplicates and add constraints to prevent future issues

-- First, identify and fix any null organization_id in organization_members
UPDATE organization_members
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1
)
WHERE organization_id IS NULL;

-- Next, identify duplicate organization members
WITH duplicate_members AS (
  SELECT 
    id,
    organization_id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
  FROM organization_members
  WHERE organization_id IS NOT NULL
)
-- Delete all but the most recent record for each user
DELETE FROM organization_members
WHERE id IN (
  SELECT id FROM duplicate_members WHERE row_num > 1
);

-- Identify duplicate employees
WITH duplicate_employees AS (
  SELECT 
    id,
    organization_id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as row_num
  FROM employees
  WHERE organization_id IS NOT NULL AND email IS NOT NULL
)
-- Delete all but the most recent record for each email
DELETE FROM employees
WHERE id IN (
  SELECT id FROM duplicate_employees WHERE row_num > 1
);

-- Add unique constraints to prevent future duplicates
-- First, check if constraints already exist
DO $$
BEGIN
  -- Add unique constraint for organization_members if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_member_user'
  ) THEN
    ALTER TABLE organization_members 
      ADD CONSTRAINT unique_org_member_user UNIQUE (user_id);
  END IF;

  -- Add unique constraint for employees if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_employee_email'
  ) THEN
    ALTER TABLE employees 
      ADD CONSTRAINT unique_employee_email UNIQUE (email);
  END IF;
END
$$;

-- Create or replace function to handle organization creation
CREATE OR REPLACE FUNCTION create_organization_simple(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT ''
) RETURNS TABLE (
  organization_id UUID,
  member_id UUID
) AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
  v_existing_member_id UUID;
  v_existing_org_id UUID;
BEGIN
  -- Check if user already has an organization
  SELECT organization_id INTO v_existing_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_org_id IS NOT NULL THEN
    -- User already has an organization, return it
    SELECT id INTO v_existing_member_id
    FROM organization_members
    WHERE user_id = p_user_id AND organization_id = v_existing_org_id;
    
    RETURN QUERY SELECT v_existing_org_id, v_existing_member_id;
    RETURN;
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_org_id;
  
  -- Create organization member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Create employee if email is provided
  IF p_user_email IS NOT NULL THEN
    -- Check if employee already exists
    IF NOT EXISTS (
      SELECT 1 FROM employees WHERE email = p_user_email
    ) THEN
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
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_org_id, v_member_id;
END;
$$ LANGUAGE plpgsql;