-- Drop the organizations table and recreate it with the correct schema
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Create organizations table
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

-- Add RLS policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow users to view organizations they are members of
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

-- Allow admins to update their organizations
CREATE POLICY "Admins can update their organizations" ON public.organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role = 'admin'::public.user_role
        )
    );

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
