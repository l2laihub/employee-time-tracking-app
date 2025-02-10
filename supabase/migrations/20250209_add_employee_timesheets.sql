-- First delete existing timesheets and their time entries
DELETE FROM time_entries e
USING organization_members m, employees emp, (
    WITH target_org AS (
        SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
    )
    SELECT e.id as employee_id
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    WHERE m.role = 'employee'
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
    LIMIT 3
) as target_employees
WHERE m.user_id = e.user_id
AND emp.member_id = m.id
AND emp.id = target_employees.employee_id;

DELETE FROM timesheets t
WHERE t.employee_id IN (
    WITH target_org AS (
        SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
    )
    SELECT e.id as employee_id
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    WHERE m.role = 'employee'
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
    LIMIT 3
);

-- Add test timesheets for regular employees
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
),
target_employees AS (
    SELECT e.id as employee_id, 
           e.first_name,
           e.last_name,
           e.status,
           m.user_id,
           m.organization_id
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.role = 'employee'  -- Only regular employees
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
    LIMIT 3  -- Get 3 test employees
)
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
        -- Employee 1: Has all statuses (first employee in the window)
        WHEN ROW_NUMBER() OVER (ORDER BY te.employee_id) = 1 THEN
            CASE 
                WHEN n < -2 THEN 'approved'   -- Past weeks approved
                WHEN n = -2 THEN 'rejected'   -- 2 weeks ago rejected
                WHEN n = -1 THEN 'submitted'  -- Last week submitted
                ELSE 'draft'                  -- Current and future weeks draft
            END
        -- Employee 2: Only drafts and submitted (second employee)
        WHEN ROW_NUMBER() OVER (ORDER BY te.employee_id) = 2 THEN
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
        WHEN status = 'approved' THEN NOW()  -- Set reviewed_at for approved timesheets
        ELSE NULL 
    END
FROM target_employees te
CROSS JOIN generate_series(-4, 1) n  -- Create timesheets for last 4 weeks plus current and next week
RETURNING id, employee_id, period_start_date, period_end_date, status;

-- Add time entries for the employees' timesheets
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
),
target_employees AS (
    SELECT e.id as employee_id, 
           m.user_id,
           m.organization_id,
           ROW_NUMBER() OVER (ORDER BY e.id) as rn
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    WHERE m.role = 'employee'
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
    LIMIT 3
),
job_locations AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn 
    FROM job_locations 
    WHERE organization_id = (SELECT id FROM target_org)
    AND is_active = true
    LIMIT 3
),
employee_timesheets AS (
    SELECT t.* 
    FROM timesheets t
    JOIN target_employees te ON te.employee_id = t.employee_id
    WHERE t.status IN ('approved', 'submitted', 'rejected')  -- Only add entries for non-draft timesheets
)
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
        WHEN n % 3 = 0 THEN 'remote'
        WHEN n % 3 = 1 THEN 'onsite'
        ELSE 'both'
    END,
    'Time entry for ' || to_char(ts.period_start_date + (n || ' days')::interval, 'Day Month DD, YYYY'),
    'completed'
FROM employee_timesheets ts
JOIN target_employees te ON te.employee_id = ts.employee_id
JOIN job_locations jl ON jl.rn = 1 + (te.rn % 3)  -- Distribute employees across job locations
CROSS JOIN generate_series(0, 4) n  -- Monday to Friday
WHERE ts.status != 'draft'  -- Skip draft timesheets
RETURNING id, clock_in, clock_out;

-- Update the total hours for the employees' timesheets
UPDATE timesheets t
SET total_hours = (
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (clock_out - clock_in))/3600 - (total_break_minutes::decimal/60)
    ), 0)
    FROM time_entries e
    JOIN organization_members m ON m.user_id = e.user_id
    JOIN employees emp ON emp.member_id = m.id
    WHERE date_trunc('day', e.clock_in) BETWEEN t.period_start_date AND t.period_end_date
    AND emp.id = t.employee_id
)
WHERE EXISTS (
    SELECT 1 FROM time_entries e
    JOIN organization_members m ON m.user_id = e.user_id
    JOIN employees emp ON emp.member_id = m.id
    WHERE date_trunc('day', e.clock_in) BETWEEN t.period_start_date AND t.period_end_date
    AND emp.id = t.employee_id
);
