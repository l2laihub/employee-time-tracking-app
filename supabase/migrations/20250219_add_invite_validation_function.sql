-- Create a secure function to validate invites
CREATE OR REPLACE FUNCTION validate_organization_invite(
  p_invite_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_org record;
BEGIN
  -- Get invite details with organization name
  SELECT 
    i.*,
    o.name as organization_name
  INTO v_invite
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.id = p_invite_id;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found'
    );
  END IF;

  -- Check invite status
  IF v_invite.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 
      CASE v_invite.status
        WHEN 'accepted' THEN 'This invite has already been used'
        WHEN 'expired' THEN 'This invite has expired'
        WHEN 'revoked' THEN 'This invite has been revoked'
        ELSE 'This invite is no longer valid'
      END
    );
  END IF;

  -- Check if invite is expired
  IF v_invite.expires_at < now() THEN
    -- Update status to expired
    UPDATE organization_invites
    SET status = 'expired'
    WHERE id = p_invite_id;

    RETURN json_build_object(
      'success', false,
      'error', 'This invite has expired'
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