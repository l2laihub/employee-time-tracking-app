-- Drop existing functions first
DROP FUNCTION IF EXISTS test_organization_setup();
DROP FUNCTION IF EXISTS check_user_role_type();

-- Function to check enum type
CREATE OR REPLACE FUNCTION check_user_role_type()
RETURNS TABLE (
    enum_name text,
    enum_values text[],
    schema_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.typname::text,
        array_agg(e.enumlabel)::text[],
        n.nspname::text
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'user_role'
    GROUP BY t.typname, n.nspname;
END;
$$;

-- Check if materialized view exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = 'organization_access'
    ) THEN
        CREATE MATERIALIZED VIEW organization_access AS
        SELECT DISTINCT
            organization_id,
            user_id,
            role = 'admin'::public.user_role as is_admin,
            role IN ('admin'::public.user_role, 'manager'::public.user_role) as is_manager
        FROM organization_members;

        CREATE UNIQUE INDEX idx_organization_access ON organization_access(organization_id, user_id);
    END IF;
END
$$;

-- Run diagnostic queries
DO $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE 'Checking enum type...';
    FOR v_result IN SELECT * FROM check_user_role_type() LOOP
        RAISE NOTICE 'Enum: % (schema: %), values: %', 
            v_result.enum_name, v_result.schema_name, v_result.enum_values;
    END LOOP;

    RAISE NOTICE 'Checking organization members...';
    FOR v_result IN 
        SELECT 
            om.id,
            om.organization_id,
            om.user_id,
            om.role,
            pg_typeof(om.role) as role_type,
            o.name as organization_name
        FROM organization_members om
        LEFT JOIN organizations o ON o.id = om.organization_id
    LOOP
        RAISE NOTICE 'Member ID: %, Organization: %, Role: % (type: %)',
            v_result.id, v_result.organization_name, v_result.role, v_result.role_type;
    END LOOP;
END;
$$;

-- Test organization setup
CREATE OR REPLACE FUNCTION test_organization_setup()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id_1 uuid := gen_random_uuid();
  v_user_id_2 uuid := gen_random_uuid();
  v_org_id uuid;
  v_member_id uuid;
  v_result RECORD;
  v_output text := '';
BEGIN
  -- Test creating first organization
  v_output := v_output || E'\nTesting first organization creation...';
  SELECT organization_id, member_id 
  INTO v_org_id, v_member_id
  FROM create_organization_transaction(
    'Test Organization 1',
    'test-org-1',
    v_user_id_1,
    NULL
  );

  ASSERT v_org_id IS NOT NULL, 'First organization creation failed';
  ASSERT v_member_id IS NOT NULL, 'First member creation failed';
  v_output := v_output || E'\nFirst organization created successfully';

  -- Test creating second organization
  v_output := v_output || E'\nTesting second organization creation...';
  SELECT organization_id, member_id 
  INTO v_org_id, v_member_id
  FROM create_organization_transaction(
    'Test Organization 2',
    'test-org-2',
    v_user_id_2,
    NULL
  );

  ASSERT v_org_id IS NOT NULL, 'Second organization creation failed';
  ASSERT v_member_id IS NOT NULL, 'Second member creation failed';
  v_output := v_output || E'\nSecond organization created successfully';

  -- Check created organizations
  v_output := v_output || E'\nChecking created organizations...';
  FOR v_result IN 
    SELECT o.name, o.slug, m.role
    FROM organizations o
    JOIN organization_members m ON m.organization_id = o.id
    WHERE o.slug IN ('test-org-1', 'test-org-2')
  LOOP
    v_output := v_output || E'\nOrganization: ' || v_result.name || 
                           E', Slug: ' || v_result.slug || 
                           E', Role: ' || v_result.role;
  END LOOP;

  -- Cleanup
  v_output := v_output || E'\nCleaning up test data...';
  DELETE FROM organization_members WHERE user_id IN (v_user_id_1, v_user_id_2);
  DELETE FROM organizations WHERE slug IN ('test-org-1', 'test-org-2');

  v_output := v_output || E'\nAll tests completed successfully';
  RETURN v_output;
END;
$$;

-- Run the tests
DO $$
DECLARE
  v_test_output text;
BEGIN
  -- Run basic tests
  v_test_output := test_organization_setup();
  RAISE NOTICE '%', v_test_output;
END;
$$;
