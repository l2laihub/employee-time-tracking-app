-- Add photo_url column to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for storage access
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Individual User Access" ON storage.objects;

-- Allow public read access to photos
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'employee-photos');

-- Allow authenticated users to manage their own photos
CREATE POLICY "Individual User Access"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'employee-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'employee-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, DELETE ON storage.objects TO authenticated;
GRANT SELECT, UPDATE ON employees TO authenticated;
