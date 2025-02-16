-- Drop all existing policies
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create simple policy that just checks basic organization access
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      inner join public.employees e 
        on e.organization_id = om.organization_id
      where om.user_id = auth.uid()
      and e.id = pto_requests.user_id
      and e.organization_id = pto_requests.organization_id
    )
  );