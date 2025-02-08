-- Enable debug logging
SET client_min_messages TO NOTICE;

-- First clean up existing test data
DELETE FROM time_entries;
DELETE FROM timesheets;

-- Debug: Print organization info
DO $$
DECLARE
    org_info record;
BEGIN
    SELECT * INTO org_info
    FROM organizations
    WHERE id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c';
    
    IF org_info IS NULL THEN
        RAISE NOTICE 'Organization not found with ID: d28682a4-bfa6-4b60-9f05-b70fdd212b8c';
    ELSE
        RAISE NOTICE 'Found organization: %, Created at: %', org_info.name, org_info.created_at;
    END IF;
END $$;

-- Debug: Print user and employee info
DO $$
DECLARE
    user_info record;
    emp_info record;
    member_info record;
BEGIN
    -- Check auth.users
    SELECT * INTO user_info
    FROM auth.users
    WHERE email = 'andy.lau@test2.com';
    
    IF user_info IS NULL THEN
        RAISE NOTICE 'User not found with email: andy.lau@test2.com';
    ELSE
        RAISE NOTICE 'Found user: ID=%, Email=%, Created at=%', 
            user_info.id, user_info.email, user_info.created_at;
            
        -- Check organization_members
        SELECT * INTO member_info
        FROM organization_members
        WHERE user_id = user_info.id
        AND organization_id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c';
        
        IF member_info IS NULL THEN
            RAISE NOTICE 'No organization member found for user';
        ELSE
            RAISE NOTICE 'Found organization member: ID=%, Role=%', 
                member_info.id, member_info.role;
                
            -- Check employees
            SELECT * INTO emp_info
            FROM employees
            WHERE member_id = member_info.id;
            
            IF emp_info IS NULL THEN
                RAISE NOTICE 'No employee found for member';
            ELSE
                RAISE NOTICE 'Found employee: ID=%, Name=% %, Status=%', 
                    emp_info.id, emp_info.first_name, emp_info.last_name, emp_info.status;
            END IF;
        END IF;
    END IF;
END $$;

-- Add test timesheets for the current week and previous week
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
    WHERE u.email = 'andy.lau@test2.com'
    AND e.status = 'active'
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
        WHEN n < -1 THEN 'submitted'  -- Past weeks (except last week) are submitted
        ELSE 'draft'                  -- Last week and current/future weeks are draft
    END,
    0,
    NOW(),
    NOW(),
    CASE 
        WHEN n < -1 THEN NOW()  -- Set submitted_at for past weeks
        ELSE NULL 
    END,
    CASE 
        WHEN n < -1 THEN NOW()  -- Set reviewed_at for past weeks
        ELSE NULL 
    END
FROM generate_series(-4, 1) n  -- Create timesheets for last 4 weeks plus current and next week
WHERE EXISTS (SELECT 1 FROM target_employee)  -- Only insert if we found the employee
RETURNING id, employee_id, period_start_date, period_end_date, status, organization_id, total_hours, created_at, updated_at, submitted_at, reviewed_at;  -- Debug: Print created timesheets

-- Debug: Print all timesheets after creation
DO $$
DECLARE
    ts_count integer;
    ts_info record;
BEGIN
    SELECT COUNT(*) INTO ts_count FROM timesheets;
    RAISE NOTICE 'Created % timesheets', ts_count;
    
    FOR ts_info IN
        SELECT t.*, e.first_name, e.last_name
        FROM timesheets t
        LEFT JOIN employees e ON e.id = t.employee_id
        ORDER BY t.period_start_date DESC
    LOOP
        RAISE NOTICE 'Timesheet: ID=%, Employee=% %, Period=% to %, Status=%',
            ts_info.id, 
            COALESCE(ts_info.first_name, 'Unknown'), 
            COALESCE(ts_info.last_name, 'Employee'),
            ts_info.period_start_date,
            ts_info.period_end_date,
            ts_info.status;
    END LOOP;
END $$;

-- Debug: Print submitted timesheets before creating time entries
DO $$
DECLARE
    ts_count integer;
    ts_info record;
BEGIN
    SELECT COUNT(*) INTO ts_count 
    FROM timesheets 
    WHERE status = 'submitted';
    
    RAISE NOTICE 'Found % submitted timesheets', ts_count;
    
    FOR ts_info IN
        SELECT t.*, e.first_name, e.last_name
        FROM timesheets t
        LEFT JOIN employees e ON e.id = t.employee_id
        WHERE t.status = 'submitted'
        ORDER BY t.period_start_date DESC
    LOOP
        RAISE NOTICE 'Submitted Timesheet: ID=%, Employee=% %, Period=% to %',
            ts_info.id, 
            COALESCE(ts_info.first_name, 'Unknown'), 
            COALESCE(ts_info.last_name, 'Employee'),
            ts_info.period_start_date,
            ts_info.period_end_date;
    END LOOP;
END $$;

-- Add some test time entries for the submitted timesheets
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
    WHERE u.email = 'andy.lau@test2.com'
    AND e.status = 'active'
),
first_job AS (
    SELECT id FROM job_locations 
    WHERE organization_id = 'd28682a4-bfa6-4b60-9f05-b70fdd212b8c'
    AND is_active = true
    LIMIT 1
),
submitted_timesheets AS (
    SELECT t.* 
    FROM timesheets t
    WHERE t.status = 'submitted'
    AND t.employee_id = (SELECT employee_id FROM target_employee)
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
    (SELECT organization_id FROM target_employee),  -- Use the member's organization_id
    (SELECT user_id FROM target_employee),  -- Use the auth.users id
    (SELECT id FROM first_job),
    ts.period_start_date + (n || ' days')::interval + interval '9 hours',
    ts.period_start_date + (n || ' days')::interval + interval '17 hours',
    30,
    'both',
    'Test time entry for ' || to_char(ts.period_start_date + (n || ' days')::interval, 'Day Month DD, YYYY'),
    'completed'
FROM submitted_timesheets ts
CROSS JOIN generate_series(0, 4) n  -- Monday to Friday
WHERE EXISTS (SELECT 1 FROM target_employee)  -- Only insert if we found the employee
AND EXISTS (SELECT 1 FROM first_job)  -- Only insert if we found a job location
RETURNING id, clock_in, clock_out, user_id;  -- Debug: Print created time entries

-- Debug: Print time entries after creation
DO $$
DECLARE
    entry_count integer;
    entry_info record;
BEGIN
    SELECT COUNT(*) INTO entry_count FROM time_entries;
    RAISE NOTICE 'Created % time entries', entry_count;
    
    FOR entry_info IN
        SELECT te.*, e.first_name, e.last_name
        FROM time_entries te
        JOIN organization_members m ON m.user_id = te.user_id
        JOIN employees e ON e.member_id = m.id
        ORDER BY te.clock_in DESC
    LOOP
        RAISE NOTICE 'Time Entry: ID=%, Employee=% %, Clock In=%, Clock Out=%',
            entry_info.id,
            COALESCE(entry_info.first_name, 'Unknown'),
            COALESCE(entry_info.last_name, 'Employee'),
            entry_info.clock_in,
            entry_info.clock_out;
    END LOOP;
END $$;

-- Update the total hours for the submitted timesheets
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

-- Debug: Print the updated timesheets with their total hours
DO $$
DECLARE
    ts_info record;
BEGIN
    FOR ts_info IN
        SELECT t.*, e.first_name, e.last_name,
            COUNT(DISTINCT te.id) as entry_count,
            SUM(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - (te.total_break_minutes::decimal/60)) as total_hours
        FROM timesheets t
        LEFT JOIN employees e ON e.id = t.employee_id
        LEFT JOIN organization_members m ON m.id = e.member_id
        LEFT JOIN time_entries te ON 
            date_trunc('day', te.clock_in) BETWEEN t.period_start_date AND t.period_end_date
            AND te.user_id = m.user_id
        GROUP BY t.id, e.first_name, e.last_name
        ORDER BY t.period_start_date DESC
    LOOP
        RAISE NOTICE 'Timesheet: ID=%, Employee=% %, Period=% to %, Status=%, Entries=%, Hours=%',
            ts_info.id, 
            COALESCE(ts_info.first_name, 'Unknown'), 
            COALESCE(ts_info.last_name, 'Employee'),
            ts_info.period_start_date,
            ts_info.period_end_date,
            ts_info.status,
            ts_info.entry_count,
            ts_info.total_hours;
    END LOOP;
END $$;

-- Debug: Final verification
DO $$
DECLARE
    final_ts record;
BEGIN
    RAISE NOTICE '=== Final Verification ===';
    FOR final_ts IN
        SELECT 
            t.*,
            e.first_name,
            e.last_name,
            COUNT(te.id) as entry_count,
            SUM(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - (te.total_break_minutes::decimal/60)) as calculated_hours
        FROM timesheets t
        LEFT JOIN employees e ON e.id = t.employee_id
        LEFT JOIN organization_members m ON m.id = e.member_id
        LEFT JOIN time_entries te ON 
            date_trunc('day', te.clock_in) BETWEEN t.period_start_date AND t.period_end_date
            AND te.user_id = m.user_id
        GROUP BY t.id, e.first_name, e.last_name
        ORDER BY t.period_start_date DESC
    LOOP
        RAISE NOTICE 'Timesheet: ID=%, Employee=% %, Period=% to %, Status=%, Entries=%, Hours=%, Calculated=%',
            final_ts.id,
            COALESCE(final_ts.first_name, 'Unknown'),
            COALESCE(final_ts.last_name, 'Employee'),
            final_ts.period_start_date,
            final_ts.period_end_date,
            final_ts.status,
            final_ts.entry_count,
            final_ts.total_hours,
            final_ts.calculated_hours;
    END LOOP;
END $$;

-- Debug: Print out employee info
DO $$
DECLARE
    emp_count integer;
    emp_info record;
BEGIN
    SELECT COUNT(*) INTO emp_count
    FROM employees e
    JOIN organization_members m ON m.id = e.member_id
    JOIN auth.users u ON u.id = m.user_id
    WHERE u.email = 'andy.lau@test2.com';

    RAISE NOTICE 'Found % employees with email andy.lau@test2.com', emp_count;

    FOR emp_info IN
        SELECT e.id, e.first_name, e.last_name, e.email, e.status, m.user_id
        FROM employees e
        JOIN organization_members m ON m.id = e.member_id
        JOIN auth.users u ON u.id = m.user_id
        WHERE u.email = 'andy.lau@test2.com'
    LOOP
        RAISE NOTICE 'Employee ID: %, Name: % %, Email: %, Status: %, User ID: %',
            emp_info.id, emp_info.first_name, emp_info.last_name, emp_info.email,
            emp_info.status, emp_info.user_id;
    END LOOP;
END $$;
