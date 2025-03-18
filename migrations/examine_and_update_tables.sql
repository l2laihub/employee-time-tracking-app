-- First, let's examine the current structure of the job_locations table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_locations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any constraints on the service_type column
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'job_locations'
  AND nsp.nspname = 'public'
  AND con.conname LIKE '%service_type%';

-- Examine the service_types table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'service_types' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Look at some sample data from both tables
SELECT id, name, service_type FROM job_locations LIMIT 5;
SELECT id, name FROM service_types LIMIT 5;
