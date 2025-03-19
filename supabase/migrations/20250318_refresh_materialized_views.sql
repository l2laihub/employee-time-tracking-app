-- Refresh the admin_members materialized view
REFRESH MATERIALIZED VIEW admin_members;

-- Add a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_admin_members()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_members;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to refresh the materialized view after organization operations
DROP TRIGGER IF EXISTS refresh_admin_members_trigger ON organizations;
CREATE TRIGGER refresh_admin_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_members();
