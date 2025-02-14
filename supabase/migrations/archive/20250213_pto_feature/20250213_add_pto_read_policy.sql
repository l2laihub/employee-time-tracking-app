-- Add read policy for PTO requests
create policy "Users can read PTO requests in their organization"
  on public.pto_requests for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = pto_requests.organization_id
      and om.user_id = auth.uid()
      and (
        -- Either they are viewing their own request
        exists (
          select 1 from public.employees e
          where e.id = pto_requests.user_id
          and e.member_id = om.id
        )
        -- Or they are an admin/manager
        or om.role in ('admin', 'manager')
      )
    )
  );