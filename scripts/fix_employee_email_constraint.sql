-- Drop the existing unique constraint on email
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Add a new composite unique constraint for email per organization
ALTER TABLE public.employees ADD CONSTRAINT employees_email_org_key UNIQUE (email, organization_id);

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_employees_email_org ON public.employees(email, organization_id);