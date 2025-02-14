-- Update type check constraint to allow 'sick_leave'
alter table public.pto_requests
  drop constraint if exists pto_requests_type_check;

alter table public.pto_requests
  add constraint pto_requests_type_check 
  check (type in ('vacation', 'sick_leave'));