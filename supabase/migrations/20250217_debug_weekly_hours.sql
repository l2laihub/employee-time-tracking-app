-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS debug_weekly_hours(timestamp with time zone, timestamp with time zone, uuid, uuid);

-- Debug query to show raw time entry data and calculations
CREATE OR REPLACE FUNCTION debug_weekly_hours(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  org_id uuid,
  employee_id uuid
)
RETURNS TABLE (
  entry_date date,
  clock_in_raw timestamp with time zone,
  clock_in_la timestamp with time zone,
  clock_out_raw timestamp with time zone,
  clock_out_la timestamp with time zone,
  day_of_week integer,
  day_name text,
  raw_duration_hours numeric,
  break_minutes numeric,
  worked_hours numeric,
  regular_hours numeric,
  overtime_hours numeric,
  status text,
  user_id uuid,
  organization_id uuid,
  included_in_results boolean,
  exclusion_reason text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has access to organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this organization''s data';
  END IF;

  RETURN QUERY
  WITH employee_user AS (
    SELECT 
      om.user_id,
      om.organization_id,
      e.id as employee_id
    FROM employees e
    JOIN organization_members om ON e.member_id = om.id
    WHERE e.id = employee_id
  )
  SELECT 
    DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'),
    te.clock_in,
    te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles',
    te.clock_out,
    te.clock_out AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles',
    to_char(DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'), 'ID')::integer,
    to_char(DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'), 'Day'),
    ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600)::numeric, 2) as raw_duration,
    COALESCE(te.total_break_minutes, 0)::numeric as break_minutes,
    ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric, 2) as worked_hours,
    CASE 
      WHEN (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) <= 8 
      THEN ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric, 2)
      ELSE 8::numeric
    END as regular_hours,
    CASE 
      WHEN (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) > 8 
      THEN ROUND(((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) - 8)::numeric, 2)
      ELSE 0::numeric
    END as overtime_hours,
    te.status,
    eu.user_id,
    te.organization_id,
    CASE WHEN 
      te.clock_out IS NOT NULL 
      AND te.status = 'completed'
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
    THEN true ELSE false END as included_in_results,
    CASE 
      WHEN te.clock_out IS NULL THEN 'No clock out'
      WHEN te.status != 'completed' THEN 'Status not completed'
      WHEN DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') THEN 'Before start date'
      WHEN DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') THEN 'After end date'
      ELSE NULL
    END as exclusion_reason
  FROM time_entries te
  JOIN employee_user eu ON te.user_id = eu.user_id
  WHERE 
    te.organization_id = org_id
    -- Show all entries within a wider date range for debugging
    AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') - INTERVAL '7 days'
    AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') + INTERVAL '7 days'
  ORDER BY te.clock_in;
END;
$$;

-- Example usage:
-- SELECT * FROM debug_weekly_hours(
--   '2025-02-03'::timestamp with time zone,
--   '2025-02-10'::timestamp with time zone,
--   'your-org-id-here'::uuid,
--   'employee-id-here'::uuid
-- );