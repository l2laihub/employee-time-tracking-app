-- Drop existing functions first
DROP FUNCTION IF EXISTS accept_organization_invite;
DROP FUNCTION IF EXISTS create_organization_invite;
DROP FUNCTION IF EXISTS debug_organization_invites;

-- Drop existing policies
DROP POLICY IF EXISTS "Invites can be read by organization admins and managers" ON organization_invites;
DROP POLICY IF EXISTS "Invites can be read by invited users" ON organization_invites;
DROP POLICY IF EXISTS "Invites can be created by organization admins and managers" ON organization_invites;
DROP POLICY IF EXISTS "Invites can be updated by organization admins and managers" ON organization_invites;
DROP POLICY IF EXISTS "Invites can be updated by invited users" ON organization_invites;
DROP POLICY IF EXISTS "Invites are readable by anyone" ON organization_invites;

-- Drop existing table if it exists
DROP TABLE IF EXISTS organization_invites;

-- Create organization_invites table
CREATE TABLE organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  email text not null,
  role user_role not null,
  invited_by uuid references auth.users(id) not null,
  status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- Add partial unique index for pending invites
CREATE UNIQUE INDEX organization_invites_unique_pending_email ON organization_invites (organization_id, email) WHERE status = 'pending';

-- Enable RLS
alter table organization_invites enable row level security;

-- RLS Policies
CREATE POLICY "Invites can be read by organization admins and managers"
ON organization_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invites.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Invites can be read by invited users"
ON organization_invites
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY "Invites can be created by organization admins and managers"
ON organization_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invites.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Invites can be updated by organization admins and managers"
ON organization_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invites.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invites.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Invites can be updated by invited users"
ON organization_invites
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  lower(email) = lower(auth.jwt() ->> 'email')
);

-- Helper function to create an invite
create or replace function create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite_id uuid;
  v_user_id uuid;
  v_email text;
begin
  -- Get the current user's ID and email
  select auth.uid() into v_user_id;
  select auth.jwt() ->> 'email' into v_email;

  -- Check if the user has permission to create invites
  if not exists (
    select 1 from organization_members
    where organization_id = p_organization_id
    and user_id = v_user_id
    and role in ('admin', 'manager')
  ) then
    raise exception 'Only organization admins and managers can create invites';
  end if;

  -- Create the invite
  insert into organization_invites (
    organization_id,
    email,
    role,
    invited_by
  )
  values (
    p_organization_id,
    lower(p_email),
    p_role::user_role,
    v_user_id
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

-- Helper function to accept an invite
create or replace function accept_organization_invite(
  p_invite_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_role user_role;
  v_email text;
begin
  -- Get the current user's ID and email
  select auth.uid() into v_user_id;
  select auth.jwt() ->> 'email' into v_email;

  -- Get and validate the invite
  select organization_id, role into v_organization_id, v_role
  from organization_invites
  where id = p_invite_id
  and lower(email) = lower(v_email)
  and status = 'pending'
  and expires_at > now();

  if v_organization_id is null then
    raise exception 'Invalid or expired invite';
  end if;

  -- Check if user is already a member
  if exists (
    select 1 from organization_members
    where organization_id = v_organization_id
    and user_id = v_user_id
  ) then
    raise exception 'User is already a member of this organization';
  end if;

  -- Create organization member
  insert into organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    v_organization_id,
    v_user_id,
    v_role
  );

  -- Update invite status
  update organization_invites
  set
    status = 'accepted',
    accepted_at = now()
  where id = p_invite_id;

  -- Mark other pending invites for this email as expired
  update organization_invites
  set
    status = 'expired'
  where lower(email) = lower(v_email)
  and status = 'pending'
  and id != p_invite_id;
end;
$$;

-- Helper function to debug invites
create or replace function debug_organization_invites(
  p_email text
)
returns table (
  id uuid,
  organization_id uuid,
  email text,
  role user_role,
  status text,
  invited_by uuid,
  created_at timestamptz,
  expires_at timestamptz,
  inviter_email text,
  organization_name text
)
language plpgsql
security definer
as $$
begin
  -- Check if the user is authorized to view this email's invites
  if not (
    lower(auth.jwt() ->> 'email') = lower(p_email) or
    exists (
      select 1 from organization_members om
      join organization_invites oi on oi.organization_id = om.organization_id
      where om.user_id = auth.uid()
      and om.role in ('admin', 'manager')
      and lower(oi.email) = lower(p_email)
    )
  ) then
    raise exception 'Not authorized to view invites for this email';
  end if;

  return query
  select 
    i.id,
    i.organization_id,
    i.email,
    i.role,
    i.status,
    i.invited_by,
    i.created_at,
    i.expires_at,
    u.email as inviter_email,
    o.name as organization_name
  from organization_invites i
  left join auth.users u on u.id = i.invited_by
  left join organizations o on o.id = i.organization_id
  where lower(i.email) = lower(p_email)
  order by i.created_at desc;
end;
$$;
