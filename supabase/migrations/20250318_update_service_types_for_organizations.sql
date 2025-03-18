-- Update service_types table to be organization-specific
-- First, check if organization_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_types' 
        AND column_name = 'organization_id'
    ) THEN
        -- Add organization_id column
        ALTER TABLE public.service_types 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        -- Assign existing service types to the first organization
        UPDATE public.service_types
        SET organization_id = (SELECT id FROM public.organizations LIMIT 1);
        
        -- Make organization_id required
        ALTER TABLE public.service_types 
        ALTER COLUMN organization_id SET NOT NULL;
        
        -- Add unique constraint for name per organization
        ALTER TABLE public.service_types 
        DROP CONSTRAINT IF EXISTS service_types_name_key;
        
        ALTER TABLE public.service_types 
        ADD CONSTRAINT service_types_name_organization_id_key UNIQUE (name, organization_id);
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view their service types" ON public.service_types;
DROP POLICY IF EXISTS "Organization admins can manage service types" ON public.service_types;

-- Policy for organization members to view service types in their organization
CREATE POLICY "Organization members can view their service types" 
  ON public.service_types
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for organization admins to manage service types
CREATE POLICY "Organization admins can manage service types" 
  ON public.service_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.organization_members om
      JOIN public.employees e ON e.member_id = om.id
      WHERE om.user_id = auth.uid()
      AND om.organization_id = service_types.organization_id
      AND e.role = 'admin'
    )
  );

-- Create or replace the function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_service_types_updated_at ON public.service_types;

-- Create the trigger
CREATE TRIGGER set_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default service types for each organization if they don't exist
INSERT INTO public.service_types (name, organization_id)
SELECT 
  s.name, 
  o.id
FROM 
  (VALUES 
    ('Residential'),
    ('Commercial'),
    ('Industrial'),
    ('Maintenance'),
    ('Installation'),
    ('Repair')
  ) AS s(name)
CROSS JOIN (
  SELECT id FROM public.organizations
) AS o
ON CONFLICT (name, organization_id) DO NOTHING;
