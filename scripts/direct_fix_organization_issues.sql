-- Direct SQL script to fix organization issues
-- Run this in the Supabase SQL editor

-- 1. First, check for any null organization_id in organization_members
SELECT * FROM organization_members WHERE organization_id IS NULL;

-- 2. Check for duplicate organization members
SELECT user_id, COUNT(*) 
FROM organization_members 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- 3. Check for duplicate employees
SELECT email, COUNT(*) 
FROM employees 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Fix any null organization_id in organization_members (if any)
UPDATE organization_members
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1
)
WHERE organization_id IS NULL;

-- 5. Remove duplicate organization members (keep the most recent)
DELETE FROM organization_members
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
    FROM organization_members
  ) t
  WHERE t.row_num > 1
);

-- 6. Remove duplicate employees (keep the most recent)
DELETE FROM employees
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as row_num
    FROM employees
  ) t
  WHERE t.row_num > 1
);

-- 7. Check RLS policies for organizations table
SELECT * FROM pg_policies WHERE tablename = 'organizations';

-- 8. Check RLS policies for organization_members table
SELECT * FROM pg_policies WHERE tablename = 'organization_members';

-- 9. Check RLS policies for employees table
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- 10. Add unique constraint to organization_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_member_user'
  ) THEN
    ALTER TABLE organization_members 
      ADD CONSTRAINT unique_org_member_user UNIQUE (user_id);
  END IF;
END
$$;

-- 11. Add unique constraint to employees if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_employee_email'
  ) THEN
    ALTER TABLE employees 
      ADD CONSTRAINT unique_employee_email UNIQUE (email);
  END IF;
END
$$;

-- 12. Check if RLS is enabled for organizations table
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'organizations';

-- 13. Check if RLS is enabled for organization_members table
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'organization_members';

-- 14. Check if RLS is enabled for employees table
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'employees';

-- 15. Ensure RLS is enabled for all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 16. Create or replace RLS policies for organizations
DROP POLICY IF EXISTS "Organizations are viewable by organization members" ON organizations;
CREATE POLICY "Organizations are viewable by organization members" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizations are insertable by authenticated users" ON organizations;
CREATE POLICY "Organizations are insertable by authenticated users" ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Organizations are updatable by organization admins" ON organizations;
CREATE POLICY "Organizations are updatable by organization admins" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 17. Create or replace RLS policies for organization_members
DROP POLICY IF EXISTS "Organization members are viewable by organization members" ON organization_members;
CREATE POLICY "Organization members are viewable by organization members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization members are insertable by organization admins" ON organization_members;
CREATE POLICY "Organization members are insertable by organization admins" ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    auth.role() = 'authenticated'
  );

-- 18. Create or replace RLS policies for employees
DROP POLICY IF EXISTS "Employees are viewable by organization members" ON employees;
CREATE POLICY "Employees are viewable by organization members" ON employees
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees are insertable by organization admins" ON employees;
CREATE POLICY "Employees are insertable by organization admins" ON employees
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    auth.role() = 'authenticated'
  );

-- 19. Drop and recreate the function to handle organization creation
DROP FUNCTION IF EXISTS create_organization_simple(text, text, uuid, text, text, text);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Temporarily disable RLS for testing (comment out if not needed)
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;