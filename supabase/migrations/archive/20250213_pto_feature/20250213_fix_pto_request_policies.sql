-- Drop existing insert policy
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create updated insert policy that checks both employee and organization membership
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.employees e
      inner join public.organization_members om 
        on e.member_id = om.id
      where e.id = pto_requests.user_id
        and om.user_id = auth.uid()
        and e.organization_id = pto_requests.organization_id
    )
  );