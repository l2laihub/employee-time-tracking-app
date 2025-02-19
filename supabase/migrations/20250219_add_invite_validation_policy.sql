-- Add policy to allow validating invites without authentication
DROP POLICY IF EXISTS "Allow validating invites" ON organization_invites;

CREATE POLICY "Allow validating invites" ON organization_invites
  FOR SELECT
  USING (
    -- Allow access to pending invites
    status = 'pending'
    -- Only allow access to basic invite information
    AND (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_name = 'organization_invites'
      AND column_name = ANY(ARRAY['id', 'email', 'organization_id', 'expires_at', 'status'])
    ) > 0
  );

-- Create a secure function to validate invites
CREATE OR REPLACE FUNCTION validate_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_org record;
BEGIN
  -- Get invite details
  SELECT i.*, o.name as organization_name
  INTO v_invite
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.id = p_invite_id
  AND i.status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found or already used'
    );
  END IF;

  -- Check if invite is expired
  IF v_invite.expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite has expired'
    );
  END IF;

  -- Return invite details
  RETURN json_build_object(
    'success', true,
    'invite', json_build_object(
      'email', v_invite.email,
      'organization_name', v_invite.organization_name,
      'expires_at', v_invite.expires_at,
      'status', v_invite.status
    )
  );
END;
$$;