-- Script to clean up duplicate records in the onboarding flow
-- This script identifies and removes duplicate records while preserving data integrity

-- First, identify duplicate organization members
WITH duplicate_members AS (
  SELECT 
    id,
    organization_id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id, user_id ORDER BY created_at DESC) as row_num
  FROM organization_members
  WHERE organization_id IS NOT NULL
)
-- Delete all but the most recent record for each organization/user pair
DELETE FROM organization_members
WHERE id IN (
  SELECT id FROM duplicate_members WHERE row_num > 1
);

-- Next, identify duplicate employees
WITH duplicate_employees AS (
  SELECT 
    id,
    organization_id,
    email,
    ROW_NUMBER() OVER (PARTITION BY organization_id, email ORDER BY created_at DESC) as row_num
  FROM employees
  WHERE organization_id IS NOT NULL AND email IS NOT NULL
)
-- Delete all but the most recent record for each organization/email pair
DELETE FROM employees
WHERE id IN (
  SELECT id FROM duplicate_employees WHERE row_num > 1
);

-- Finally, identify duplicate departments and service types
WITH duplicate_departments AS (
  SELECT 
    id,
    organization_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY organization_id, LOWER(name) ORDER BY created_at DESC) as row_num
  FROM departments
  WHERE organization_id IS NOT NULL
)
-- Delete all but the most recent record for each organization/department name pair
DELETE FROM departments
WHERE id IN (
  SELECT id FROM duplicate_departments WHERE row_num > 1
);

WITH duplicate_service_types AS (
  SELECT 
    id,
    organization_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY organization_id, LOWER(name) ORDER BY created_at DESC) as row_num
  FROM service_types
  WHERE organization_id IS NOT NULL
)
-- Delete all but the most recent record for each organization/service type name pair
DELETE FROM service_types
WHERE id IN (
  SELECT id FROM duplicate_service_types WHERE row_num > 1
);

-- Add unique constraints to prevent future duplicates
ALTER TABLE organization_members 
  ADD CONSTRAINT unique_org_member UNIQUE (organization_id, user_id);

ALTER TABLE employees 
  ADD CONSTRAINT unique_org_employee UNIQUE (organization_id, email);

ALTER TABLE departments 
  ADD CONSTRAINT unique_org_department UNIQUE (organization_id, name);

ALTER TABLE service_types 
  ADD CONSTRAINT unique_org_service_type UNIQUE (organization_id, name);