-- Enable extensions
create extension if not exists "uuid-ossp";

-- Drop any existing policies that might conflict
do $$
begin
  drop policy if exists "service_role can manage buckets" on storage.buckets;
  drop policy if exists "Allow authenticated users to upload files" on storage.objects;
  drop policy if exists "Allow users to update their own files" on storage.objects;
  drop policy if exists "Allow users to delete their own files" on storage.objects;
  drop policy if exists "Allow public read access" on storage.objects;
exception
  when others then
    raise notice 'Error dropping policies: %', sqlerrm;
end $$;

-- Enable RLS
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

-- Create storage bucket for employee photos if it doesn't exist
do $$
declare
  bucket_exists boolean;
begin
  select exists(
    select 1 from storage.buckets where id = 'employee-photos'
  ) into bucket_exists;

  if not bucket_exists then
    insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    values (
      'employee-photos',
      'employee-photos',
      true,
      false,
      5242880, -- 5MB
      array['image/jpeg', 'image/png']
    );
    raise notice 'Created employee-photos bucket';
  else
    raise notice 'employee-photos bucket already exists';
  end if;
exception
  when others then
    raise notice 'Error creating bucket: %', sqlerrm;
    raise;
end $$;

-- Allow authenticated users to use the bucket
create policy "Allow authenticated users to use bucket"
on storage.buckets
for all
to authenticated
using (id = 'employee-photos')
with check (id = 'employee-photos');

-- Allow service_role to manage all buckets
create policy "service_role can manage buckets"
on storage.buckets
for all
to service_role
using (true)
with check (true);

-- Allow authenticated users to upload files to the employee-photos bucket
create policy "Allow authenticated users to upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-photos' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own files
create policy "Allow users to update their own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'employee-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'employee-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
create policy "Allow users to delete their own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'employee-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to read files
create policy "Allow public read access"
on storage.objects
for select
to public
using (bucket_id = 'employee-photos');

-- Verify bucket creation and policies
do $$
declare
  bucket_count int;
  policy_count int;
begin
  select count(*) into bucket_count
  from storage.buckets
  where id = 'employee-photos';

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'storage'
    and (tablename = 'buckets' or tablename = 'objects');

  raise notice 'Verification: Found % employee-photos bucket and % storage policies', bucket_count, policy_count;
end $$;