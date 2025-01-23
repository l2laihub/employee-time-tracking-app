-- First drop existing tables to recreate them with proper relationships
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.admin_members;

-- Create organizations table first
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{
        "primary_color": "#3b82f6",
        "secondary_color": "#1e40af",
        "logo_url": null,
        "favicon_url": null,
        "company_name": null,
        "company_website": null
    }'::jsonb
);

-- Create organization_members table with foreign key reference
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'employee'::public.user_role,
    permissions JSONB DEFAULT '{}',
    UNIQUE(organization_id, user_id)
);

-- Create materialized view for admin roles (this avoids recursion)
CREATE MATERIALIZED VIEW public.admin_members AS
SELECT DISTINCT organization_id, user_id
FROM public.organization_members
WHERE role = 'admin'::public.user_role;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_admin_members ON public.admin_members(organization_id, user_id);

-- Add indexes for better query performance
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their organizations" ON public.organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.admin_members
            WHERE admin_members.organization_id = organizations.id
            AND admin_members.user_id = auth.uid()
        )
    );

-- Organization members policies
CREATE POLICY "View own memberships" ON public.organization_members
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins full access" ON public.organization_members
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

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Initial refresh of the admin_members view
REFRESH MATERIALIZED VIEW public.admin_members;
