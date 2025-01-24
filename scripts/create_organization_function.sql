-- Drop existing functions
DROP FUNCTION IF EXISTS create_organization_transaction(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS create_organization(text);

-- Function to create organization and add first member as admin
CREATE OR REPLACE FUNCTION create_organization_transaction(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID,
  p_branding JSONB
)
RETURNS TABLE (
  organization_id UUID,
  member_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Create organization
  INSERT INTO organizations (
    name,
    slug,
    branding
  ) VALUES (
    p_name,
    p_slug,
    COALESCE(p_branding, '{
      "primary_color": "#3b82f6",
      "secondary_color": "#1e40af",
      "logo_url": null,
      "favicon_url": null,
      "company_name": null,
      "company_website": null
    }'::jsonb)
  )
  RETURNING id INTO v_org_id;

  -- Add user as admin
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role
  ) VALUES (
    v_org_id,
    p_user_id,
    'admin'::public.user_role
  )
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_org_id, v_member_id;
END;
$$;

-- Simple function for frontend to create organization
CREATE OR REPLACE FUNCTION create_organization(
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_slug TEXT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug from name
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));

  -- Create organization using the transaction function
  SELECT organization_id INTO v_org_id
  FROM create_organization_transaction(
    p_name,
    v_slug,
    v_user_id,
    NULL
  );

  RETURN v_org_id;
END;
$$;
