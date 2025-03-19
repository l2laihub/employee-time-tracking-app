-- Add missing columns to organization_invites table
ALTER TABLE organization_invites
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id);

-- Update the accept_organization_invite function to match the table structure
create or replace function accept_organization_invite(
  p_invite_id uuid,
  p_user_id uuid
) returns json
language plpgsql
security definer
as $$
declare
  v_invite record;
  v_user record;
  v_result json;
begin
  -- Get invite details
  select * into v_invite
  from organization_invites
  where id = p_invite_id
  and status = 'pending'
  for update;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Invite not found or already used'
    );
  end if;

  -- Check if invite is expired
  if v_invite.expires_at < now() then
    return json_build_object(
      'success', false,
      'error', 'Invite has expired'
    );
  end if;

  -- Get user email
  select email into v_user
  from auth.users
  where id = p_user_id;

  -- Verify email matches invite
  if v_user.email != v_invite.email then
    return json_build_object(
      'success', false,
      'error', 'Email does not match invite'
    );
  end if;

  -- Create organization membership
  insert into organization_members (
    user_id,
    organization_id,
    role
  ) values (
    p_user_id,
    v_invite.organization_id,
    v_invite.role
  )
  on conflict (user_id, organization_id) do nothing;

  -- Update invite status
  update organization_invites
  set 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id
  where id = p_invite_id;

  return json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id
  );
end;
$$;
