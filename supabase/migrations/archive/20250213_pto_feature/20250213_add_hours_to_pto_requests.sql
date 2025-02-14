-- Add hours column to PTO requests table
alter table public.pto_requests
  add column hours numeric not null;

-- Add comment for documentation
comment on column public.pto_requests.hours is 'Number of hours requested for PTO';