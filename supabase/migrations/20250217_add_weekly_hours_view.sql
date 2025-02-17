-- Create weekly hours summary view
CREATE OR REPLACE VIEW weekly_employee_hours AS
WITH time_entry_hours AS (
  SELECT 
    te.user_id,
    te.organization_id,
    te.job_location_id,
    te.status,
    -- Normalize date to America/Los_Angeles timezone
    DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') as entry_date,
    -- Calculate worked hours accounting for breaks
    ROUND(
      (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric,
      2
    ) as worked_hours,
    te.service_type as type
  FROM time_entries te
  WHERE
    te.clock_out IS NOT NULL -- Only include entries with clock out time
)
SELECT 
  e.id,
  e.first_name || ' ' || e.last_name as name,
  e.organization_id,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 1 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as monday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 2 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as tuesday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 3 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as wednesday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 4 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as thursday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 5 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as friday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 6 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as saturday,
  ROUND(SUM(CASE WHEN to_char(teh.entry_date, 'ID')::integer = 7 THEN teh.worked_hours ELSE 0 END)::numeric, 2) as sunday,
  -- Calculate total hours without daily cap
  ROUND(SUM(teh.worked_hours)::numeric, 2) as total_regular,
  -- Calculate overtime based on weekly total over 40 hours
  ROUND(CASE 
    WHEN SUM(teh.worked_hours) > 40 THEN SUM(teh.worked_hours) - 40
    ELSE 0 
  END::numeric, 2) as total_ot,
  ROUND(SUM(CASE WHEN teh.type = 'vacation' THEN teh.worked_hours ELSE 0 END)::numeric, 2) as vacation_hours,
  ROUND(SUM(CASE WHEN teh.type = 'sick' THEN teh.worked_hours ELSE 0 END)::numeric, 2) as sick_leave_hours,
  -- Calculate total vacation allocation
  ROUND((
    COALESCE((e.pto->'vacation'->>'beginningBalance')::numeric, 0) + 
    COALESCE((e.pto->'vacation'->>'ongoingBalance')::numeric, 0) +
    -- Add base allocation based on start date
    CASE 
      WHEN DATE_PART('year', AGE(CURRENT_DATE, e.start_date::date)) < 1 THEN
        -- First year: Pro-rate 40 hours based on months worked
        FLOOR(40 * DATE_PART('month', AGE(CURRENT_DATE, e.start_date::date)) / 12)
      ELSE 
        -- Second year onwards: 80 hours
        80
    END
  )::numeric, 2) as vacation_balance,
  -- Calculate available sick leave balance
  COALESCE((e.pto->'sickLeave'->>'beginningBalance')::numeric, 0) - 
  COALESCE((e.pto->'sickLeave'->>'used')::numeric, 0) as sick_leave_balance
FROM 
  employees e
  INNER JOIN organization_members om ON e.member_id = om.id
  LEFT JOIN time_entry_hours teh ON om.user_id = teh.user_id
  AND teh.organization_id = e.organization_id
GROUP BY 
  e.id, e.first_name, e.last_name, e.organization_id, om.user_id, e.pto, e.start_date;
-- Drop existing objects with CASCADE to handle dependencies
DROP VIEW IF EXISTS weekly_employee_hours CASCADE;
DROP TYPE IF EXISTS weekly_hours_result CASCADE;
DROP TYPE IF EXISTS weekly_hours_result CASCADE;

-- Create a type to match the view's structure
CREATE TYPE weekly_hours_result AS (
  id uuid,
  name text,
  organization_id uuid,
  job_location_ids uuid[],
  monday numeric,
  tuesday numeric,
  wednesday numeric,
  thursday numeric,
  friday numeric,
  saturday numeric,
  sunday numeric,
  total_regular numeric,
  total_ot numeric,
  vacation_hours numeric,
  sick_leave_hours numeric,
  vacation_balance numeric,
  sick_leave_balance numeric
);

-- Create function to get weekly hours with date range and organization access control
CREATE OR REPLACE FUNCTION get_weekly_employee_hours(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  org_id uuid
)
RETURNS SETOF weekly_hours_result
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has access to organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this organization''s data';
  END IF;

  -- Return data for the organization and date range
  RETURN QUERY
  WITH filtered_time_entries AS (
    SELECT 
      te.user_id,
      te.organization_id,
      te.job_location_id,
      te.status,
      DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') as entry_date,
      ROUND(
        (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric,
        2
      ) as worked_hours,
      te.service_type as type
    FROM time_entries te
    WHERE
      te.organization_id = org_id
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND te.clock_out IS NOT NULL
  ),
  weekly_totals AS (
    -- Calculate weekly totals for each employee
    SELECT 
      user_id,
      DATE_TRUNC('week', entry_date) as week_start,
      ROUND(COALESCE(SUM(worked_hours), 0)::numeric, 2) as week_total
    FROM filtered_time_entries
    GROUP BY user_id, DATE_TRUNC('week', entry_date)
  )
  SELECT
    e.id,
    e.first_name || ' ' || e.last_name as name,
    e.organization_id,
    -- Include job location array
    ARRAY_AGG(DISTINCT fte.job_location_id) FILTER (WHERE fte.job_location_id IS NOT NULL) as job_location_ids,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 1 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as monday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 2 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as tuesday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 3 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as wednesday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 4 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as thursday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 5 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as friday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 6 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as saturday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 7 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as sunday,
    -- Calculate total regular hours (capped at 40 per week)
    ROUND(COALESCE(SUM(
      CASE
        WHEN wt.week_total <= 40 THEN fte.worked_hours
        ELSE ROUND((fte.worked_hours * 40.0 / wt.week_total)::numeric, 2)
      END
    ), 0)::numeric, 2) as total_regular,
    -- Calculate overtime (hours over 40 per week)
    ROUND(COALESCE(SUM(
      CASE
        WHEN wt.week_total > 40 THEN ROUND((fte.worked_hours * (wt.week_total - 40.0) / wt.week_total)::numeric, 2)
        ELSE 0
      END
    ), 0)::numeric, 2) as total_ot,
    ROUND(COALESCE(SUM(CASE WHEN fte.type = 'vacation' THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as vacation_hours,
    ROUND(COALESCE(SUM(CASE WHEN fte.type = 'sick' THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as sick_leave_hours,
    -- Calculate total vacation allocation
    ROUND((
      COALESCE((e.pto->'vacation'->>'beginningBalance')::numeric, 0) + 
      COALESCE((e.pto->'vacation'->>'ongoingBalance')::numeric, 0) +
      -- Add base allocation based on start date
      CASE 
        WHEN DATE_PART('year', AGE(CURRENT_DATE, e.start_date::date)) < 1 THEN
          -- First year: Pro-rate 40 hours based on months worked
          FLOOR(40 * DATE_PART('month', AGE(CURRENT_DATE, e.start_date::date)) / 12)
        ELSE 
          -- Second year onwards: 80 hours
          80
      END
    )::numeric, 2) as vacation_balance,
    -- Calculate available sick leave balance
    COALESCE((e.pto->'sickLeave'->>'beginningBalance')::numeric, 0) - 
    COALESCE((e.pto->'sickLeave'->>'used')::numeric, 0) as sick_leave_balance
  FROM 
    employees e
    INNER JOIN organization_members om ON e.member_id = om.id
    LEFT JOIN filtered_time_entries fte ON om.user_id = fte.user_id
    LEFT JOIN weekly_totals wt ON fte.user_id = wt.user_id 
      AND DATE_TRUNC('week', fte.entry_date) = wt.week_start
    AND fte.organization_id = e.organization_id
  WHERE e.organization_id = org_id
  GROUP BY 
    e.id, e.first_name, e.last_name, e.organization_id, om.user_id, e.pto, e.start_date;
END;
$$;