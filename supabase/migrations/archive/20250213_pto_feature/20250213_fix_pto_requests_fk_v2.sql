-- Drop existing foreign key constraint
alter table public.pto_requests
  drop constraint if exists pto_requests_user_id_fkey;

-- Add correct foreign key constraint to employees table
alter table public.pto_requests
  add constraint pto_requests_user_id_fkey
  foreign key (user_id)
  references public.employees(id)
  on delete cascade;