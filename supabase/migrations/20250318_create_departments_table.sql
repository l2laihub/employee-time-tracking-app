-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(name, organization_id)
);

-- Create RLS policies for departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view their departments" ON public.departments;
DROP POLICY IF EXISTS "Organization admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "All employees can view departments" ON public.departments;

-- Policy for organization members to view departments in their organization
CREATE POLICY "Organization members can view their departments" 
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for organization admins to manage departments
CREATE POLICY "Organization admins can manage departments" 
  ON public.departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.organization_members om
      JOIN public.employees e ON e.member_id = om.id
      WHERE om.user_id = auth.uid()
      AND om.organization_id = departments.organization_id
      AND e.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and create it
DROP TRIGGER IF EXISTS set_departments_updated_at ON public.departments;
CREATE TRIGGER set_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default departments if they don't exist (for demo purposes)
-- In a real app, you would initialize departments during organization creation
INSERT INTO public.departments (name, organization_id)
SELECT 
  d.name, 
  o.id
FROM 
  (VALUES 
    ('Administration'),
    ('Management'),
    ('Office'),
    ('Field Work'),
    ('Human Resources'),
    ('Finance'),
    ('Customer Service')
  ) AS d(name)
CROSS JOIN (
  SELECT id FROM public.organizations LIMIT 1
) AS o
ON CONFLICT (name, organization_id) DO NOTHING;
