-- Migration script to update job_locations table constraints
-- This script modifies the service_type column to work with UUIDs

-- First, check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_locations_service_type_check' 
    AND conrelid = 'job_locations'::regclass
  ) THEN
    ALTER TABLE public.job_locations DROP CONSTRAINT job_locations_service_type_check;
  END IF;
END
$$;

-- Create a temporary column to store the UUID values
ALTER TABLE public.job_locations ADD COLUMN service_type_uuid UUID;

-- Update the temporary column with the corresponding UUID values from service_types
-- We'll do this in separate updates to avoid type conversion issues
UPDATE public.job_locations AS jl
SET service_type_uuid = st.id
FROM public.service_types AS st
WHERE jl.service_type = 'hvac' AND st.name = 'HVAC';

UPDATE public.job_locations AS jl
SET service_type_uuid = st.id
FROM public.service_types AS st
WHERE jl.service_type = 'plumbing' AND st.name = 'Plumbing';

UPDATE public.job_locations AS jl
SET service_type_uuid = st.id
FROM public.service_types AS st
WHERE jl.service_type = 'both' AND st.name = 'Both';

-- Drop the old service_type column and rename the new one
ALTER TABLE public.job_locations DROP COLUMN service_type;
ALTER TABLE public.job_locations RENAME COLUMN service_type_uuid TO service_type;

-- Add a foreign key constraint to ensure service_type references a valid service_types.id
ALTER TABLE public.job_locations
ADD CONSTRAINT job_locations_service_type_fkey
FOREIGN KEY (service_type)
REFERENCES public.service_types(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
