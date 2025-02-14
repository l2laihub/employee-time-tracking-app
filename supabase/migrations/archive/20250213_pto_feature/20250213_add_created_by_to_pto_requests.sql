-- Add created_by column to PTO requests table
alter table public.pto_requests
  add column created_by uuid references auth.users(id);

-- Add comment for documentation
comment on column public.pto_requests.created_by is 'Reference to the user who created the request';

-- Update existing rows to set created_by to user_id
update public.pto_requests
  set created_by = user_id
  where created_by is null;

-- Make created_by not null after setting defaults
alter table public.pto_requests
  alter column created_by set not null;