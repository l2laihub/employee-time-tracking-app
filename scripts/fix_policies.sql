-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage all members" ON public.organization_members;

-- Disable RLS temporarily
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Create a materialized view for admin roles (this avoids recursion)
DROP MATERIALIZED VIEW IF EXISTS public.admin_members;
CREATE MATERIALIZED VIEW public.admin_members AS
SELECT DISTINCT organization_id, user_id
FROM public.organization_members
WHERE role = 'admin'::public.user_role;

CREATE UNIQUE INDEX idx_admin_members ON public.admin_members(organization_id, user_id);

-- Re-enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create basic policies using the materialized view
CREATE POLICY "View own memberships"
    ON public.organization_members
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins full access"
    ON public.organization_members
    USING (
        EXISTS (
            SELECT 1 
            FROM public.admin_members
            WHERE admin_members.user_id = auth.uid() 
            AND admin_members.organization_id = organization_members.organization_id
        )
    );

-- Function to refresh admin members view
CREATE OR REPLACE FUNCTION refresh_admin_members()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.admin_members;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh the view when organization_members changes
DROP TRIGGER IF EXISTS refresh_admin_members_trigger ON public.organization_members;
CREATE TRIGGER refresh_admin_members_trigger
    AFTER INSERT OR UPDATE OR DELETE
    ON public.organization_members
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_admin_members();

-- Initial refresh of the view
REFRESH MATERIALIZED VIEW public.admin_members;
