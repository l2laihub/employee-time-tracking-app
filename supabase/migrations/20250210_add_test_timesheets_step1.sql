-- Step 1: Create temp tables for target data
CREATE TEMP TABLE temp_target_employees AS
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
)
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    m.user_id,
    m.organization_id,
    ROW_NUMBER() OVER (ORDER BY e.id) as employee_number
FROM employees e
JOIN organization_members m ON m.id = e.member_id
WHERE m.role = 'employee'
AND e.status = 'active'
AND m.organization_id = (SELECT id FROM target_org)
LIMIT 3;

CREATE TEMP TABLE temp_job_locations AS
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
)
SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as location_number
FROM job_locations 
WHERE organization_id = (SELECT id FROM target_org)
AND is_active = true
LIMIT 3;

-- Step 2: Clean up existing data
DELETE FROM time_entries e
USING temp_target_employees te
WHERE e.user_id IN (SELECT user_id FROM temp_target_employees);

DELETE FROM timesheets t
WHERE t.employee_id IN (SELECT employee_id FROM temp_target_employees);

-- Verify temp tables
SELECT * FROM temp_target_employees;
SELECT * FROM temp_job_locations;
