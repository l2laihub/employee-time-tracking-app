-- Migration script to create a function that creates the service_types table
-- This script can be run manually against your Supabase database

-- Create the trigger function first (outside the main function)
CREATE OR REPLACE FUNCTION update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create the service_types table
CREATE OR REPLACE FUNCTION public.create_service_types_table()
RETURNS void AS $$
BEGIN
  -- Create the service_types table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Add RLS policies
  ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

  -- Policy for select (read) - allow authenticated users to read all service types
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

  -- Policy for insert - only allow admins to insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow admins to insert service types'
  ) THEN
    CREATE POLICY "Allow admins to insert service types"
      ON public.service_types
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;

  -- Policy for update - only allow admins to update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow admins to update service types'
  ) THEN
    CREATE POLICY "Allow admins to update service types"
      ON public.service_types
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;

  -- Policy for delete - only allow admins to delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_types' 
    AND policyname = 'Allow admins to delete service types'
  ) THEN
    CREATE POLICY "Allow admins to delete service types"
      ON public.service_types
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = 'admin'
        )
      );
  END IF;

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

  -- Add the trigger
  DROP TRIGGER IF EXISTS update_service_types_updated_at_trigger ON public.service_types;
  CREATE TRIGGER update_service_types_updated_at_trigger
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_service_types_updated_at();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_service_types_table() TO authenticated;
