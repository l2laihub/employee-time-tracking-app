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

-- Step 2: Insert timesheets for regular employees
INSERT INTO timesheets (
    organization_id,
    employee_id,
    period_start_date,
    period_end_date,
    status,
    total_hours,
    created_at,
    updated_at,
    submitted_at,
    reviewed_at
)
SELECT 
    te.organization_id,
    te.employee_id,
    date_trunc('week', CURRENT_DATE)::date + (n * 7 || ' days')::interval,
    date_trunc('week', CURRENT_DATE)::date + ((n * 7) + 6 || ' days')::interval,
    CASE 
        -- Employee 1: Has all statuses
        WHEN te.employee_number = 1 THEN
            CASE 
                WHEN n < -2 THEN 'approved'   -- Past weeks approved
                WHEN n = -2 THEN 'rejected'   -- 2 weeks ago rejected
                WHEN n = -1 THEN 'submitted'  -- Last week submitted
                ELSE 'draft'                  -- Current and future weeks draft
            END
        -- Employee 2: Only drafts and submitted
        WHEN te.employee_number = 2 THEN
            CASE 
                WHEN n <= -1 THEN 'submitted' -- Past weeks submitted
                ELSE 'draft'                  -- Current and future weeks draft
            END
        -- Employee 3: All approved except current
        ELSE
            CASE 
                WHEN n < 0 THEN 'approved'    -- Past weeks approved
                ELSE 'draft'                  -- Current and future weeks draft
            END
    END,
    CASE 
        WHEN n < 0 THEN 40  -- Past weeks full time
        ELSE 0              -- Current and future weeks start at 0
    END,
    NOW(),
    NOW(),
    CASE 
        WHEN n <= -1 THEN NOW()  -- Set submitted_at for past weeks
        ELSE NULL 
    END,
    CASE 
        WHEN n < -2 THEN NOW()  -- Set reviewed_at for approved timesheets
        ELSE NULL 
    END
FROM temp_target_employees te
CROSS JOIN generate_series(-4, 1) n  -- Create timesheets for last 4 weeks plus current and next week
RETURNING id, employee_id, period_start_date, period_end_date, status;
