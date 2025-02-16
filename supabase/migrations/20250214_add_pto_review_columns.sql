-- Add review-related columns to pto_requests table
ALTER TABLE pto_requests
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update RLS policies to allow admins/managers to update review fields
DROP POLICY IF EXISTS "Users can update their pending PTO requests" ON pto_requests;
CREATE POLICY "Users can update their pending PTO requests" ON pto_requests
  FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = pto_requests.organization_id 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    (auth.uid() = user_id AND status = 'pending') OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = pto_requests.organization_id 
      AND role IN ('admin', 'manager')
    )
  );