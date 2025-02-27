-- Update RLS policies for the organizations table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view their organization" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON organizations;

-- Create new policies
-- Allow organization members to view their organization
CREATE POLICY "Organization members can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow organization admins to update their organization
CREATE POLICY "Organization admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );