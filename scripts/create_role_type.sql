-- First drop the materialized view that depends on user_role
DROP MATERIALIZED VIEW IF EXISTS public.organization_access;

-- Drop any existing policies that depend on user_role
DROP POLICY IF EXISTS "Admins and managers can manage all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Only admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage invites" ON public.organization_invites;

-- Drop the type with CASCADE to handle remaining dependencies
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create the role enum type in public schema
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'member');

-- Add role column to organization_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.organization_members ADD COLUMN role public.user_role NOT NULL DEFAULT 'member';
    ELSE
        -- Drop any existing constraints
        ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS valid_role;
        
        -- Convert existing role values to the new type
        ALTER TABLE public.organization_members 
            ALTER COLUMN role TYPE public.user_role 
            USING CASE role 
                WHEN 'admin' THEN 'admin'::public.user_role
                WHEN 'manager' THEN 'manager'::public.user_role
                ELSE 'member'::public.user_role
            END;
    END IF;
END $$;

-- Add role column to organization_invites if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invites' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.organization_invites ADD COLUMN role public.user_role NOT NULL DEFAULT 'member';
    ELSE
        -- Drop any existing constraints
        ALTER TABLE public.organization_invites DROP CONSTRAINT IF EXISTS valid_role;
        
        -- Convert existing role values to the new type
        ALTER TABLE public.organization_invites 
            ALTER COLUMN role TYPE public.user_role 
            USING CASE role 
                WHEN 'admin' THEN 'admin'::public.user_role
                WHEN 'manager' THEN 'manager'::public.user_role
                ELSE 'member'::public.user_role
            END;
    END IF;
END $$;

-- Add constraints to ensure valid roles
ALTER TABLE public.organization_members 
    DROP CONSTRAINT IF EXISTS valid_role,
    ADD CONSTRAINT valid_role 
    CHECK (role IN ('admin'::public.user_role, 'manager'::public.user_role, 'member'::public.user_role));

ALTER TABLE public.organization_invites 
    DROP CONSTRAINT IF EXISTS valid_role,
    ADD CONSTRAINT valid_role 
    CHECK (role IN ('admin'::public.user_role, 'manager'::public.user_role, 'member'::public.user_role));
