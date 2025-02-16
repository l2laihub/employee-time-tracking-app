-- Drop all existing policies
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create simple policy that just checks organization membership and role
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = pto_requests.organization_id
      and om.user_id = auth.uid()
      and (
        -- Either they are requesting for their own employee record
        exists (
          select 1 from public.employees e
          where e.id = pto_requests.user_id
          and e.email = (select email from auth.users where id = om.user_id)
        )
        -- Or they are an admin/manager
        or om.role in ('admin', 'manager')
      )
    )
  );