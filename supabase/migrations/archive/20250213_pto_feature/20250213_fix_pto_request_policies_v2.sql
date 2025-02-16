-- Drop existing insert policy
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create updated insert policy that checks organization membership and employee access
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.user_id = auth.uid()
      and om.organization_id = pto_requests.organization_id
      and (
        -- Either the user is creating a request for their own employee record
        exists (
          select 1 from public.employees e
          where e.id = pto_requests.user_id
          and e.organization_id = om.organization_id
          and e.member_id = om.id
        )
        -- Or they are an admin/manager creating a request for another employee
        or (
          om.role in ('admin', 'manager')
          and exists (
            select 1 from public.employees e
            where e.id = pto_requests.user_id
            and e.organization_id = om.organization_id
          )
        )
      )
    )
  );