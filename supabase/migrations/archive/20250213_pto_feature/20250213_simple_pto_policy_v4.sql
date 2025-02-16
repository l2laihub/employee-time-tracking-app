-- Drop all existing policies
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create simple policy that uses member_id relationship
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      inner join public.employees e 
        on e.organization_id = om.organization_id
      where om.user_id = auth.uid()
      and e.id = pto_requests.user_id
      and (
        -- Either they are requesting for their own employee record
        e.member_id = om.id
        -- Or they are an admin/manager
        or om.role in ('admin', 'manager')
      )
    )
  );