-- Drop existing insert policy
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create simplified insert policy
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = pto_requests.organization_id
      and (
        -- Either the user is creating their own request
        (om.user_id = auth.uid() and om.user_id = pto_requests.user_id)
        -- Or they are an admin/manager creating a request for someone else
        or (om.user_id = auth.uid() and om.role in ('admin', 'manager'))
      )
    )
  );