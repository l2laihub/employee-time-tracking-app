-- Notify PostgREST of schema changes
NOTIFY pgrst, 'reload schema';

-- Add comment to time_entries table to ensure it's visible to PostgREST
COMMENT ON TABLE time_entries IS 'Table for storing employee time entries';

-- Add comments on columns to ensure they're visible to PostgREST
COMMENT ON COLUMN time_entries.clock_in IS 'Time when employee clocked in';
COMMENT ON COLUMN time_entries.clock_out IS 'Time when employee clocked out';
COMMENT ON COLUMN time_entries.service_type IS 'Type of service provided (hvac, plumbing, both)';
COMMENT ON COLUMN time_entries.status IS 'Current status of the time entry (active, break, completed)';

-- Refresh materialized views if any exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT matviewname FROM pg_matviews) LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(r.matviewname);
    END LOOP;
END $$;
