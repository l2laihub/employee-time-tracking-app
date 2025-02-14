-- Drop existing insert policy
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create simplified insert policy
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = pto_requests.organization_id
      and om.user_id = auth.uid()
      and (
        -- Either creating request for themselves
        auth.uid() = pto_requests.created_by
        -- Or they are an admin/manager
        or om.role in ('admin', 'manager')
      )
    )
  );