-- Check if time_entries table exists and has the correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;
