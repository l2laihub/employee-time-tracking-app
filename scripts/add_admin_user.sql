-- Insert admin user into organization_members
-- Replace the values in parentheses with your actual user_id and organization_id
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES 
('0fd3a5b7-b5da-4240-b3ec-552fedfde6bd', -- your user ID
 (SELECT id FROM public.organizations LIMIT 1), -- gets the first organization, modify if needed
 'admin'::public.user_role
);
