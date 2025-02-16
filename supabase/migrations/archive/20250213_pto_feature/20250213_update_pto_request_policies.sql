-- Drop existing insert policy
drop policy if exists "Users can create own PTO requests" on public.pto_requests;

-- Create updated insert policy that checks organization membership
create policy "Users can create own PTO requests"
  on public.pto_requests for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.organization_members
      where user_id = auth.uid()
      and organization_id = pto_requests.organization_id
    )
  );