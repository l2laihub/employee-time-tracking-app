-- Drop existing function first
DROP FUNCTION IF EXISTS create_organization_transaction(text, text, uuid, jsonb);

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
    role,
    permissions
  ) VALUES (
    v_org_id,
    p_user_id,
    'admin'::public.user_role,
    '{
      "can_manage_members": true,
      "can_manage_settings": true,
      "can_view_reports": true
    }'::jsonb
  )
  RETURNING id INTO v_member_id;

  -- Refresh the admin_members view
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.admin_members;

  RETURN QUERY SELECT v_org_id, v_member_id;
END;
$$;
