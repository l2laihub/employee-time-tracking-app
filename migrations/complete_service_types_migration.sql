-- Complete migration script for service_types functionality
-- This script handles both creating the service_types table and updating job_locations

-- PART 1: Create the service_types table
CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Policy for select (read) - allow authenticated users to read all service types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow authenticated users to read service types'
  ) THEN
    CREATE POLICY "Allow authenticated users to read service types"
      ON public.service_types
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Policy for insert - allow organization admins to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow organization admins to insert service types'
  ) THEN
    CREATE POLICY "Allow organization admins to insert service types"
      ON public.service_types
      FOR INSERT
      WITH CHECK (
        -- Check for admin role
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;
END
$$;

-- Policy for update - allow organization admins to update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow organization admins to update service types'
  ) THEN
    CREATE POLICY "Allow organization admins to update service types"
      ON public.service_types
      FOR UPDATE
      USING (
        -- Check for admin role
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;
END
$$;

-- Policy for delete - allow organization admins to delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow organization admins to delete service types'
  ) THEN
    CREATE POLICY "Allow organization admins to delete service types"
      ON public.service_types
      FOR DELETE
      USING (
        -- Check for admin role
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;
END
$$;

-- Seed with default service types if the table is empty
INSERT INTO public.service_types (name)
SELECT name
FROM (
  VALUES 
    ('HVAC'),
    ('Plumbing'),
    ('Both')
) AS default_types(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_types
);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_types_updated_at_trigger ON public.service_types;
CREATE TRIGGER update_service_types_updated_at_trigger
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION update_service_types_updated_at();

-- PART 2: Update the job_locations table to work with service_types

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

-- Create a mapping table to store the relationship between old values and new UUIDs
CREATE TEMP TABLE service_type_mapping (
  old_value TEXT,
  new_id UUID
);

-- Insert the mapping values
INSERT INTO service_type_mapping (old_value, new_id)
SELECT 'hvac', id FROM public.service_types WHERE name = 'HVAC'
UNION ALL
SELECT 'plumbing', id FROM public.service_types WHERE name = 'Plumbing'
UNION ALL
SELECT 'both', id FROM public.service_types WHERE name = 'Both';

-- Create a temporary column to store the UUID values
ALTER TABLE public.job_locations ADD COLUMN service_type_new UUID;

-- Update the temporary column with the corresponding UUID values from the mapping table
-- Cast service_type to TEXT to avoid type mismatch
UPDATE public.job_locations AS jl
SET service_type_new = stm.new_id
FROM service_type_mapping stm
WHERE jl.service_type::TEXT = stm.old_value;

-- Drop the old service_type column and rename the new one
ALTER TABLE public.job_locations DROP COLUMN service_type;
ALTER TABLE public.job_locations RENAME COLUMN service_type_new TO service_type;

-- Add a foreign key constraint to ensure service_type references a valid service_types.id
ALTER TABLE public.job_locations
ADD CONSTRAINT job_locations_service_type_fkey
FOREIGN KEY (service_type)
REFERENCES public.service_types(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
