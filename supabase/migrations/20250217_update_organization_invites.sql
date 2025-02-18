-- Update organization_invites table
ALTER TABLE organization_invites
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Add check constraint for status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_invites_status_check'
  ) THEN
    ALTER TABLE organization_invites
      ADD CONSTRAINT organization_invites_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'email_failed'));
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_invites_email_org
  ON organization_invites(email, organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_invites_status
  ON organization_invites(status);

-- Update RLS policies
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Policy for viewing invites
DROP POLICY IF EXISTS "View organization invites" ON organization_invites;
CREATE POLICY "View organization invites" ON organization_invites
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for creating invites
DROP POLICY IF EXISTS "Create organization invites" ON organization_invites;
CREATE POLICY "Create organization invites" ON organization_invites
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin')
    )
  );

-- Policy for updating invites
DROP POLICY IF EXISTS "Update organization invites" ON organization_invites;
CREATE POLICY "Update organization invites" ON organization_invites
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin')
    )
  );

-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE organization_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Create a cron job to run cleanup every hour
SELECT cron.schedule(
  'cleanup-expired-invites',
  '0 * * * *', -- Every hour
  $$SELECT cleanup_expired_invites()$$
);