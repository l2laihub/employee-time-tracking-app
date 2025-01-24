-- Step 1: Create branding bucket
begin;
  insert into storage.buckets (id, name, public)
  values ('branding', 'branding', true)
  on conflict (id) do nothing;
commit;

-- Enable RLS
alter table storage.objects enable row level security;

-- Create policies
begin;
  -- Allow public read access to branding bucket
  drop policy if exists "Public Access" on storage.objects;
  create policy "Public Access"
    on storage.objects for select
    using ( bucket_id = 'branding' );

  -- Allow organization members to upload
  drop policy if exists "Organization Members Upload" on storage.objects;
  create policy "Organization Members Upload"
    on storage.objects for insert
    with check (
      bucket_id = 'branding' 
      and (
        -- Extract organization ID from the file path and verify membership
        auth.uid() in (
          select user_id 
          from organization_members
          where organization_id = cast(split_part(name, '/', 1) as uuid)
          and role = 'admin'
        )
      )
    );

  -- Allow organization members to update
  drop policy if exists "Organization Members Update" on storage.objects;
  create policy "Organization Members Update"
    on storage.objects for update
    using (
      bucket_id = 'branding'
      and (
        -- Extract organization ID from the file path and verify membership
        auth.uid() in (
          select user_id 
          from organization_members
          where organization_id = cast(split_part(name, '/', 1) as uuid)
          and role = 'admin'
        )
      )
    );

  -- Allow organization members to delete
  drop policy if exists "Organization Members Delete" on storage.objects;
  create policy "Organization Members Delete"
    on storage.objects for delete
    using (
      bucket_id = 'branding'
      and (
        -- Extract organization ID from the file path and verify membership
        auth.uid() in (
          select user_id 
          from organization_members
          where organization_id = cast(split_part(name, '/', 1) as uuid)
          and role = 'admin'
        )
      )
    );
commit;
