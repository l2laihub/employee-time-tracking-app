-- Create PTO requests table
create table public.pto_requests (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  user_id uuid references auth.users(id) not null,
  start_date date not null,
  end_date date not null,
  type text not null check (type in ('vacation', 'sick')),
  status text not null check (status in ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz default now(),
  
  -- Ensure end date is not before start date
  constraint valid_date_range check (end_date >= start_date)
);

-- Add indexes for common queries
create index pto_requests_user_id_idx on public.pto_requests(user_id);
create index pto_requests_organization_id_idx on public.pto_requests(organization_id);
create index pto_requests_status_idx on public.pto_requests(status);
create index pto_requests_date_range_idx on public.pto_requests(start_date, end_date);

-- Enable RLS
alter table public.pto_requests enable row level security;

-- PTO Request Policies

-- Users can read their own PTO requests
create policy "Users can view own PTO requests"
  on public.pto_requests for select
  using (auth.uid() = user_id);

-- Users can create PTO requests for themselves
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (auth.uid() = user_id);

-- Users can update their own pending PTO requests
create policy "Users can update own pending PTO requests"
  on public.pto_requests for update
  using (auth.uid() = user_id and status = 'pending');

-- Users can delete their own pending PTO requests
create policy "Users can delete own pending PTO requests"
  on public.pto_requests for delete
  using (auth.uid() = user_id and status = 'pending');

-- Managers can view all PTO requests in their organization
create policy "Managers can view org PTO requests"
  on public.pto_requests for select
  using (
    exists (
      select 1 from public.organization_members
      where user_id = auth.uid()
      and organization_id = pto_requests.organization_id
      and role = 'manager'
    )
  );

-- Managers can update PTO request status
create policy "Managers can update PTO request status"
  on public.pto_requests for update
  using (
    exists (
      select 1 from public.organization_members
      where user_id = auth.uid()
      and organization_id = pto_requests.organization_id
      and role = 'manager'
    )
  );

-- Add foreign key constraints with cascading deletes
alter table public.pto_requests
  add constraint pto_requests_organization_id_fkey
  foreign key (organization_id)
  references public.organizations(id)
  on delete cascade;

-- Add comments for documentation
comment on table public.pto_requests is 'Stores PTO (Paid Time Off) requests for employees';
comment on column public.pto_requests.id is 'Unique identifier for the PTO request';
comment on column public.pto_requests.organization_id is 'Reference to the organization the request belongs to';
comment on column public.pto_requests.user_id is 'Reference to the user who made the request';
comment on column public.pto_requests.start_date is 'Start date of the PTO request';
comment on column public.pto_requests.end_date is 'End date of the PTO request';
comment on column public.pto_requests.type is 'Type of PTO request (vacation or sick)';
comment on column public.pto_requests.status is 'Current status of the request (pending, approved, or rejected)';
comment on column public.pto_requests.notes is 'Optional notes for the request';
comment on column public.pto_requests.created_at is 'Timestamp when the request was created';
