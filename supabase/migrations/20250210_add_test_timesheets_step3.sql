-- Recreate temp tables
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

-- Create temp table for existing timesheets
CREATE TEMP TABLE temp_employee_timesheets AS
SELECT t.* 
FROM timesheets t
JOIN temp_target_employees te ON te.employee_id = t.employee_id
WHERE t.status IN ('approved', 'submitted', 'rejected');  -- Only add entries for non-draft timesheets

-- Step 3: Insert time entries
INSERT INTO time_entries (
    organization_id,
    user_id,
    job_location_id,
    clock_in,
    clock_out,
    total_break_minutes,
    service_type,
    work_description,
    status
)
SELECT 
    ts.organization_id,
    te.user_id,
    jl.id,
    ts.period_start_date + (n || ' days')::interval + interval '9 hours',
    ts.period_start_date + (n || ' days')::interval + interval '17 hours',
    CASE 
        WHEN n % 2 = 0 THEN 30  -- 30 min break on even days
        ELSE 60                 -- 60 min break on odd days
    END,
    CASE 
        WHEN n % 3 = 0 THEN 'both'
        WHEN n % 3 = 1 THEN 'hvac'
        ELSE 'plumbing'
    END,
    'Time entry for ' || to_char(ts.period_start_date + (n || ' days')::interval, 'Day Month DD, YYYY'),
    'completed'
FROM temp_employee_timesheets ts
JOIN temp_target_employees te ON te.employee_id = ts.employee_id
JOIN temp_job_locations jl ON jl.location_number = 1 + (te.employee_number % 3)  -- Distribute employees across job locations
CROSS JOIN generate_series(0, 4) n  -- Monday to Friday
RETURNING id, clock_in, clock_out;
