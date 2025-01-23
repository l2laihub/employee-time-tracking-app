-- Drop existing functions and policies
DROP FUNCTION IF EXISTS is_organization_member(uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS is_organization_admin(uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS check_organization_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS check_organization_admin(uuid, uuid) CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Organizations are visible to their members" ON organizations;
DROP POLICY IF EXISTS "Only authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Only admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Members can view members in their organization" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "View own membership" ON organization_members;
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Manage members" ON organization_members;
DROP POLICY IF EXISTS "Members can view organization invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can insert invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can update invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can manage invites" ON organization_invites;
DROP POLICY IF EXISTS "Users can view organization time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can manage their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins and managers can manage all time entries" ON time_entries;

-- Create materialized view for organization access
DROP MATERIALIZED VIEW IF EXISTS organization_access;
CREATE MATERIALIZED VIEW organization_access AS
SELECT DISTINCT
  organization_id,
  user_id,
  role::public.user_role = 'admin'::public.user_role as is_admin,
  role::public.user_role IN ('admin'::public.user_role, 'manager'::public.user_role) as is_manager
FROM organization_members;

CREATE UNIQUE INDEX idx_organization_access ON organization_access(organization_id, user_id);

-- Function to refresh organization access
CREATE OR REPLACE FUNCTION refresh_organization_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY organization_access;
  RETURN NULL;
END;
$$;

-- Trigger to refresh organization access
DROP TRIGGER IF EXISTS refresh_organization_access ON organization_members;
CREATE TRIGGER refresh_organization_access
AFTER INSERT OR UPDATE OR DELETE ON organization_members
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_organization_access();

-- Create helper functions that bypass RLS
CREATE OR REPLACE FUNCTION check_organization_access(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = p_org_id 
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION check_organization_admin(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = p_org_id 
    AND user_id = p_user_id
    AND role = 'admin'::public.user_role
  );
$$;

-- Organization Members policies
CREATE POLICY "Users can view their own memberships"
ON organization_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view organization members"
ON organization_members FOR SELECT
TO authenticated
USING (check_organization_access(organization_id, auth.uid()));

CREATE POLICY "Admins can manage members"
ON organization_members FOR ALL
TO authenticated
USING (check_organization_admin(organization_id, auth.uid()));

-- Organizations policies
CREATE POLICY "Organizations are visible to their members"
ON organizations FOR SELECT
TO authenticated
USING (check_organization_access(id, auth.uid()));

CREATE POLICY "Only authenticated users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can update their organization"
ON organizations FOR UPDATE
TO authenticated
USING (check_organization_admin(id, auth.uid()));

-- Organization Invites policies
CREATE POLICY "Members can view organization invites"
ON organization_invites FOR SELECT
TO authenticated
USING (check_organization_access(organization_id, auth.uid()));

CREATE POLICY "Admins can manage invites"
ON organization_invites FOR ALL
TO authenticated
USING (check_organization_admin(organization_id, auth.uid()));

-- Time Entries policies
CREATE POLICY "Users can view organization time entries"
ON time_entries FOR SELECT
TO authenticated
USING (check_organization_access(organization_id, auth.uid()));

CREATE POLICY "Users can manage their own time entries"
ON time_entries FOR ALL
TO authenticated
USING (
  check_organization_access(organization_id, auth.uid()) 
  AND user_id = auth.uid()
);

CREATE POLICY "Admins and managers can manage all time entries"
ON time_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = time_entries.organization_id 
    AND user_id = auth.uid()
    AND role IN ('admin'::public.user_role, 'manager'::public.user_role)
  )
);
