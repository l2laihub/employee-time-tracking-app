-- This migration represents the consolidated state of all PTO-related changes
-- Original migrations are archived in supabase/migrations/archive/20250213_pto_feature/

-- Update PTO requests table
ALTER TABLE pto_requests
ADD COLUMN hours INTEGER NOT NULL DEFAULT 8,
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ALTER COLUMN notes RENAME TO reason;

-- Create PTO request function
CREATE OR REPLACE FUNCTION create_pto_request(
  p_user_id UUID,
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_type TEXT,
  p_hours INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_request_id UUID;
BEGIN
  -- Insert the PTO request
  INSERT INTO pto_requests (
    user_id,
    organization_id,
    start_date,
    end_date,
    type,
    hours,
    reason,
    status,
    created_by
  )
  VALUES (
    p_user_id,
    p_organization_id,
    p_start_date,
    p_end_date,
    p_type,
    p_hours,
    p_reason,
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_request_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'data', (SELECT row_to_json(r) FROM pto_requests r WHERE r.id = v_request_id)
  );
EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Update policies
ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own PTO requests" ON pto_requests;
CREATE POLICY "Users can read their own PTO requests" ON pto_requests
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = pto_requests.organization_id 
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can create their own PTO requests" ON pto_requests;
CREATE POLICY "Users can create their own PTO requests" ON pto_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = pto_requests.organization_id 
      AND role IN ('admin', 'manager')
    )
  );

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
  );

DROP POLICY IF EXISTS "Users can delete their pending PTO requests" ON pto_requests;
CREATE POLICY "Users can delete their pending PTO requests" ON pto_requests
  FOR DELETE
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = pto_requests.organization_id 
      AND role IN ('admin', 'manager')
    )
  );

-- Add foreign key constraint
ALTER TABLE pto_requests
  DROP CONSTRAINT IF EXISTS pto_requests_user_id_fkey,
  ADD CONSTRAINT pto_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES employees(id) 
    ON DELETE CASCADE;