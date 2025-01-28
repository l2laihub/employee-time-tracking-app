-- First, drop any existing check constraint on status
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'time_entries_status_check'
    ) THEN
        ALTER TABLE time_entries DROP CONSTRAINT time_entries_status_check;
    END IF;
END $$;

-- Update status column to have a default of 'working'
ALTER TABLE time_entries 
ALTER COLUMN status SET DEFAULT 'working'::text,
ADD CONSTRAINT time_entries_status_check 
CHECK (status IN ('working', 'break', 'completed'));
