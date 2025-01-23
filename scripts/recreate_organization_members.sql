-- Drop the materialized view first since it depends on organization_members
DROP MATERIALIZED VIEW IF EXISTS public.organization_access;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins and managers can manage all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Only admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage invites" ON public.organization_invites;

-- Drop the organization_members table
DROP TABLE IF EXISTS public.organization_members CASCADE;

-- Make sure the user_role type exists with correct values
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');

-- Recreate the organization_members table with the correct role type
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Recreate the materialized view
CREATE MATERIALIZED VIEW public.organization_access AS
SELECT DISTINCT
    om.organization_id,
    om.user_id,
    om.role = 'admin'::public.user_role as is_admin,
    om.role IN ('admin'::public.user_role, 'manager'::public.user_role) as is_manager
FROM public.organization_members om;

CREATE UNIQUE INDEX idx_organization_access ON public.organization_access(organization_id, user_id);

-- Add RLS policies
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own organization memberships
CREATE POLICY "Users can view their own memberships"
    ON public.organization_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow organization admins to manage members
CREATE POLICY "Admins can manage members"
    ON public.organization_members
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'admin'::public.user_role
        )
    );
