-- Fix for organization creation transaction error
-- This migration addresses the error: "CONCURRENTLY cannot be used when the materialized view is not populated"

-- First, let's check if the create_organization_transaction function exists
DROP FUNCTION IF EXISTS public.create_organization_transaction;

-- Recreate the function without using CONCURRENTLY for materialized view refresh
CREATE OR REPLACE FUNCTION public.create_organization_transaction(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID,
  p_branding JSONB
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
  r RECORD;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, slug, branding)
  VALUES (p_name, p_slug, p_branding)
  RETURNING id INTO v_org_id;
  
  -- Create organization member
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Create default service types for the organization
  INSERT INTO public.service_types (name, organization_id)
  VALUES 
    ('Residential', v_org_id),
    ('Commercial', v_org_id),
    ('Industrial', v_org_id),
    ('Maintenance', v_org_id),
    ('Installation', v_org_id),
    ('Repair', v_org_id)
  ON CONFLICT (name, organization_id) DO NOTHING;
  
  -- Refresh any materialized views (without CONCURRENTLY)
  -- This is a safer approach that won't fail if the view isn't populated
  BEGIN
    -- Try to refresh materialized views if they exist
    -- We're using dynamic SQL to avoid errors if views don't exist
    FOR r IN (
      SELECT matviewname::text 
      FROM pg_matviews 
      WHERE schemaname = 'public'
    ) LOOP
      EXECUTE 'REFRESH MATERIALIZED VIEW public.' || quote_ident(r.matviewname);
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue with transaction
    RAISE NOTICE 'Error refreshing materialized views: %', SQLERRM;
  END;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_transaction TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION public.create_organization_transaction IS 
  'Creates an organization, adds the creator as an admin member, and sets up default service types';

-- This migration fixes the organization creation issue related to materialized views
-- by providing a simpler alternative function that doesn't rely on the materialized view

-- First, try to refresh the materialized view
REFRESH MATERIALIZED VIEW admin_members;

-- Create a simpler function to create organizations without relying on materialized views
CREATE OR REPLACE FUNCTION public.create_organization_simple(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  organization_id UUID,
  member_id UUID
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_member_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_organization_id;
  
  -- Create the organization member with admin role
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_organization_id, p_user_id, 'admin')
  RETURNING id INTO v_member_id;
  
  -- Return the organization and member IDs
  RETURN QUERY SELECT v_organization_id, v_member_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_simple TO authenticated;

-- Create a trigger function to refresh the materialized view after organization operations
CREATE OR REPLACE FUNCTION public.refresh_admin_members_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to refresh the materialized view
  BEGIN
    REFRESH MATERIALIZED VIEW admin_members;
  EXCEPTION WHEN OTHERS THEN
    -- If refresh fails, just continue
    RAISE NOTICE 'Failed to refresh admin_members materialized view: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to refresh the materialized view after organization operations
DROP TRIGGER IF EXISTS refresh_admin_members_trigger ON organizations;
CREATE TRIGGER refresh_admin_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_members_trigger_func();
