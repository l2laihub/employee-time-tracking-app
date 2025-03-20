-- Create stored procedure for adding departments to an organization
CREATE OR REPLACE FUNCTION create_departments_for_organization(
  p_organization_id UUID,
  p_department_names TEXT[]
)
RETURNS VOID AS $$
DECLARE
  dept_name TEXT;
BEGIN
  -- Loop through the department names and insert each one
  FOREACH dept_name IN ARRAY p_department_names
  LOOP
    INSERT INTO departments (name, organization_id)
    VALUES (dept_name, p_organization_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for adding service types to an organization
CREATE OR REPLACE FUNCTION create_service_types_for_organization(
  p_organization_id UUID,
  p_service_type_names TEXT[]
)
RETURNS VOID AS $$
DECLARE
  type_name TEXT;
BEGIN
  -- Loop through the service type names and insert each one
  FOREACH type_name IN ARRAY p_service_type_names
  LOOP
    INSERT INTO service_types (name, organization_id)
    VALUES (type_name, p_organization_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_departments_for_organization TO authenticated;
GRANT EXECUTE ON FUNCTION create_service_types_for_organization TO authenticated;
