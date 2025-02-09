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

-- Update status column to have a default of 'active'
ALTER TABLE time_entries 
ALTER COLUMN status SET DEFAULT 'active'::text,
ADD CONSTRAINT time_entries_status_check 
CHECK (status IN ('active', 'break', 'completed'));

-- Update any existing 'working' statuses to 'active'
UPDATE time_entries
SET status = 'active'
WHERE status = 'working';
