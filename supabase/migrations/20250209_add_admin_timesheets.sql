-- Add test timesheets for admin user
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
),
target_employee AS (
    SELECT e.id as employee_id, 
           e.first_name,
           e.last_name,
           e.status,
           m.user_id,
           m.organization_id
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.role = 'admin'
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
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
    (SELECT organization_id FROM target_employee),
    (SELECT employee_id FROM target_employee),
    date_trunc('week', CURRENT_DATE)::date + (n * 7 || ' days')::interval,
    date_trunc('week', CURRENT_DATE)::date + ((n * 7) + 6 || ' days')::interval,
    CASE 
        WHEN n < -1 THEN 'approved'  -- Past weeks (except last week) are approved
        WHEN n = -1 THEN 'submitted' -- Last week is submitted
        ELSE 'draft'                 -- Current and future weeks are draft
    END,
    40,  -- Default to 40 hours for test data
    NOW(),
    NOW(),
    CASE 
        WHEN n <= -1 THEN NOW()  -- Set submitted_at for past weeks and last week
        ELSE NULL 
    END,
    CASE 
        WHEN n < -1 THEN NOW()  -- Set reviewed_at for past weeks only
        ELSE NULL 
    END
FROM generate_series(-4, 1) n  -- Create timesheets for last 4 weeks plus current and next week
WHERE EXISTS (SELECT 1 FROM target_employee)  -- Only insert if we found the employee
RETURNING id, employee_id, period_start_date, period_end_date, status;

-- Add time entries for the admin's timesheets
WITH target_org AS (
    SELECT id FROM organizations WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
),
target_employee AS (
    SELECT e.id as employee_id, 
           e.first_name,
           e.last_name,
           e.status,
           m.user_id,
           m.organization_id
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.role = 'admin'
    AND e.status = 'active'
    AND m.organization_id = (SELECT id FROM target_org)
),
first_job AS (
    SELECT id FROM job_locations 
    WHERE organization_id = (SELECT id FROM target_org)
    AND is_active = true
    LIMIT 1
),
admin_timesheets AS (
    SELECT t.* 
    FROM timesheets t
    WHERE t.employee_id = (SELECT employee_id FROM target_employee)
    AND t.status IN ('approved', 'submitted')  -- Only add entries for approved and submitted timesheets
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
    (SELECT organization_id FROM target_employee),
    (SELECT user_id FROM target_employee),
    (SELECT id FROM first_job),
    ts.period_start_date + (n || ' days')::interval + interval '9 hours',
    ts.period_start_date + (n || ' days')::interval + interval '17 hours',
    30,
    'both',
    'Admin time entry for ' || to_char(ts.period_start_date + (n || ' days')::interval, 'Day Month DD, YYYY'),
    'completed'
FROM admin_timesheets ts
CROSS JOIN generate_series(0, 4) n  -- Monday to Friday
WHERE EXISTS (SELECT 1 FROM target_employee)
AND EXISTS (SELECT 1 FROM first_job)
RETURNING id, clock_in, clock_out;

-- Update the total hours for the admin's timesheets
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
