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

-- Step 4: Update total hours for timesheets
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
WHERE t.employee_id IN (SELECT employee_id FROM temp_target_employees)
RETURNING id, employee_id, period_start_date, period_end_date, status, total_hours;
