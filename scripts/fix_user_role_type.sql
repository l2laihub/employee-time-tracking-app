-- Drop and recreate the user_role type
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');

-- Drop and recreate the materialized view since it depends on the type
DROP MATERIALIZED VIEW IF EXISTS public.admin_members;
CREATE MATERIALIZED VIEW public.admin_members AS
SELECT DISTINCT organization_id, user_id
FROM public.organization_members
WHERE role IN ('admin', 'manager');

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_admin_members ON public.admin_members(organization_id, user_id);

-- Update default role in organization_members table
ALTER TABLE public.organization_members 
ALTER COLUMN role SET DEFAULT 'employee'::public.user_role;

-- Initial refresh of the admin_members view
REFRESH MATERIALIZED VIEW public.admin_members;
