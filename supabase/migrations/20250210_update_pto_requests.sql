-- Add missing columns to PTO requests table
alter table public.pto_requests
  add column hours numeric not null,
  add column reason text not null,
  add column created_by uuid references auth.users(id),
  add column reviewed_by uuid references auth.users(id),
  add column reviewed_at timestamptz;

-- Add check constraint for hours
alter table public.pto_requests
  add constraint valid_hours check (hours > 0);

-- Update type check to match PTOType
alter table public.pto_requests
  drop constraint pto_requests_type_check,
  add constraint pto_requests_type_check check (type in ('vacation', 'sick_leave'));

-- Add indexes for new columns
create index pto_requests_created_by_idx on public.pto_requests(created_by);
create index pto_requests_reviewed_by_idx on public.pto_requests(reviewed_by);

-- Add comments for new columns
comment on column public.pto_requests.hours is 'Number of PTO hours requested';
comment on column public.pto_requests.reason is 'Reason for the PTO request';
comment on column public.pto_requests.created_by is 'Reference to the user who created the request (if different from user_id)';
comment on column public.pto_requests.reviewed_by is 'Reference to the user who reviewed the request';
comment on column public.pto_requests.reviewed_at is 'Timestamp when the request was reviewed';
