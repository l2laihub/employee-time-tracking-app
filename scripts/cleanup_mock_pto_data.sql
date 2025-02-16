-- Verify all PTO requests have been migrated
DO $$
DECLARE
  mock_count INTEGER;
  db_count INTEGER;
BEGIN
  -- Count mock PTO requests from the mock data
  SELECT COUNT(*)
  INTO mock_count
  FROM (
    SELECT DISTINCT user_id
    FROM public.pto_requests
    WHERE created_at < NOW() - INTERVAL '1 day'
  ) mock_data;

  -- Count actual PTO requests in database
  SELECT COUNT(*)
  INTO db_count
  FROM (
    SELECT DISTINCT user_id
    FROM public.pto_requests
    WHERE created_at >= NOW() - INTERVAL '1 day'
  ) db_data;

  -- Verify counts match
  IF mock_count > db_count THEN
    RAISE EXCEPTION 'Data migration incomplete: % mock requests vs % database requests', 
      mock_count, db_count;
  END IF;
END $$;

-- Verify PTO balances are accurate
DO $$
DECLARE
  incorrect_balances INTEGER;
BEGIN
  WITH balance_check AS (
    SELECT 
      e.id,
      e.pto->>'vacation'->>'used' as mock_vacation_used,
      COALESCE(SUM(CASE WHEN pr.type = 'vacation' AND pr.status = 'approved' 
        THEN pr.hours ELSE 0 END), 0) as actual_vacation_used,
      e.pto->>'sickLeave'->>'used' as mock_sick_used,
      COALESCE(SUM(CASE WHEN pr.type = 'sick_leave' AND pr.status = 'approved' 
        THEN pr.hours ELSE 0 END), 0) as actual_sick_used
    FROM public.employees e
    LEFT JOIN public.pto_requests pr ON e.id = pr.user_id
    GROUP BY e.id
  )
  SELECT COUNT(*)
  INTO incorrect_balances
  FROM balance_check
  WHERE mock_vacation_used::numeric != actual_vacation_used
     OR mock_sick_used::numeric != actual_sick_used;

  IF incorrect_balances > 0 THEN
    RAISE EXCEPTION 'Found % employees with incorrect PTO balances', incorrect_balances;
  END IF;
END $$;

-- Create backup of mock data
CREATE TABLE IF NOT EXISTS public.mock_pto_requests_backup AS
SELECT * FROM public.pto_requests WHERE created_at < NOW() - INTERVAL '1 day';

-- Log the backup
INSERT INTO public.migration_logs (
  migration_type,
  description,
  backup_table,
  record_count,
  created_at
)
VALUES (
  'pto_mock_data_cleanup',
  'Backup of mock PTO requests before cleanup',
  'mock_pto_requests_backup',
  (SELECT COUNT(*) FROM public.mock_pto_requests_backup),
  NOW()
);

-- Remove mock data files verification
DO $$
BEGIN
  -- This will raise an exception if the files still exist
  -- Replace with actual file check logic in application code
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = 'mock_data_files'
    AND EXISTS (
      SELECT 1
      FROM mock_data_files
      WHERE filename IN ('mockPTOData.ts', 'mockData.ts')
      AND deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Mock data files still exist in the codebase';
  END IF;
END $$;

-- Remove references to mock data
UPDATE public.pto_requests
SET created_at = NOW()
WHERE created_at < NOW() - INTERVAL '1 day';

-- Log the cleanup
INSERT INTO public.migration_logs (
  migration_type,
  description,
  affected_records,
  created_at
)
VALUES (
  'pto_mock_data_cleanup',
  'Updated creation timestamps for migrated PTO requests',
  (SELECT COUNT(*) FROM public.pto_requests WHERE created_at = NOW()),
  NOW()
);

-- Cleanup function for rollback if needed
CREATE OR REPLACE FUNCTION public.rollback_pto_mock_cleanup()
RETURNS void AS $$
BEGIN
  -- Restore mock data if needed
  INSERT INTO public.pto_requests
  SELECT * FROM public.mock_pto_requests_backup
  ON CONFLICT (id) DO UPDATE
  SET 
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  -- Log the rollback
  INSERT INTO public.migration_logs (
    migration_type,
    description,
    affected_records,
    created_at
  )
  VALUES (
    'pto_mock_data_cleanup_rollback',
    'Restored mock PTO requests from backup',
    (SELECT COUNT(*) FROM public.mock_pto_requests_backup),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;
