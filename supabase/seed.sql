-- Insert test organization
INSERT INTO organizations (name) 
VALUES ('Test Organization');

-- Insert test organization member (will need to replace with actual user ID)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE name = 'Test Organization'),
  '31b141d5-2923-4d08-8dd5-38c09f638405', -- Replace with actual user ID
  'owner'
);

-- Insert test job locations
INSERT INTO job_locations (
  name,
  address,
  city,
  state,
  zip,
  type,
  service_type,
  is_active,
  organization_id
) VALUES 
  (
    'Downtown Office Building',
    '123 Main St',
    'San Francisco',
    'CA',
    '94105',
    'commercial',
    'hvac',
    true,
    (SELECT id FROM organizations WHERE name = 'Test Organization')
  ),
  (
    'Residential Complex',
    '456 Park Ave',
    'San Francisco',
    'CA',
    '94103',
    'residential',
    'plumbing',
    true,
    (SELECT id FROM organizations WHERE name = 'Test Organization')
  ),
  (
    'Shopping Mall',
    '789 Market St',
    'San Francisco',
    'CA',
    '94102',
    'commercial',
    'both',
    true,
    (SELECT id FROM organizations WHERE name = 'Test Organization')
  );
