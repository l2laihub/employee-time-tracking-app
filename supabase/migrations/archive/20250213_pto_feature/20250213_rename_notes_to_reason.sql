-- Rename notes column to reason for better clarity
alter table public.pto_requests
  rename column notes to reason;

-- Update comment for documentation
comment on column public.pto_requests.reason is 'Reason provided for the PTO request';