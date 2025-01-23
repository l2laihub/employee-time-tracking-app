-- Check if user_role type exists and its values
SELECT t.typname, e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Check organization_members table structure
SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- Check if there's any data in organization_members
SELECT * FROM organization_members;

-- Check if there's any data in organizations
SELECT * FROM organizations;
