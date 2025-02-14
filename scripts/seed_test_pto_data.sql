-- Clear existing test data
DELETE FROM public.pto_requests WHERE organization_id IN (
  SELECT id FROM public.organizations WHERE name LIKE 'Test Organization%'
);

-- Create test organizations if they don't exist
INSERT INTO public.organizations (id, name, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Organization 1', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Test Organization 2', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test users if they don't exist
INSERT INTO auth.users (id, email)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'employee1@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'employee2@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager1@test.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin1@test.com')
ON CONFLICT (id) DO NOTHING;

-- Create test employees
INSERT INTO public.employees (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  role,
  status,
  start_date,
  pto
)
VALUES
  -- New employee (less than 1 year)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'New',
   'Employee',
   'employee1@test.com',
   'employee',
   'active',
   (NOW() - INTERVAL '6 months')::date,
   '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 0}, "sickLeave": {"beginningBalance": 0, "used": 0}}'::jsonb
  ),
  
  -- Existing employee (more than 1 year)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'Existing',
   'Employee',
   'employee2@test.com',
   'employee',
   'active',
   (NOW() - INTERVAL '2 years')::date,
   '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 16}, "sickLeave": {"beginningBalance": 0, "used": 8}}'::jsonb
  ),
  
  -- Manager
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111',
   'Test',
   'Manager',
   'manager1@test.com',
   'manager',
   'active',
   (NOW() - INTERVAL '3 years')::date,
   '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 24}, "sickLeave": {"beginningBalance": 0, "used": 16}}'::jsonb
  ),
  
  -- Admin
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '11111111-1111-1111-1111-111111111111',
   'Test',
   'Admin',
   'admin1@test.com',
   'admin',
   'active',
   (NOW() - INTERVAL '4 years')::date,
   '{"vacation": {"beginningBalance": 0, "ongoingBalance": 0, "firstYearRule": 40, "used": 32}, "sickLeave": {"beginningBalance": 0, "used": 24}}'::jsonb
  );

-- Create test PTO requests
INSERT INTO public.pto_requests (
  id,
  organization_id,
  user_id,
  start_date,
  end_date,
  type,
  hours,
  reason,
  status,
  notes,
  created_at,
  created_by,
  reviewed_by,
  reviewed_at
)
VALUES
  -- New employee pending request
  ('11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (NOW() + INTERVAL '1 week')::date,
   (NOW() + INTERVAL '1 week + 1 day')::date,
   'vacation',
   8,
   'Personal day',
   'pending',
   NULL,
   NOW() - INTERVAL '1 day',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   NULL,
   NULL
  ),
  
  -- Existing employee approved request
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   (NOW() - INTERVAL '1 week')::date,
   (NOW() - INTERVAL '1 week + 3 days')::date,
   'vacation',
   24,
   'Family vacation',
   'approved',
   'Approved as requested',
   NOW() - INTERVAL '2 weeks',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   NOW() - INTERVAL '13 days'
  ),
  
  -- Existing employee rejected request
  ('33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   (NOW() + INTERVAL '2 weeks')::date,
   (NOW() + INTERVAL '2 weeks + 1 day')::date,
   'sick_leave',
   8,
   'Doctor appointment',
   'rejected',
   'Please provide doctor note',
   NOW() - INTERVAL '3 days',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   NOW() - INTERVAL '2 days'
  ),
  
  -- Manager pending request
  ('44444444-4444-4444-4444-444444444444',
   '11111111-1111-1111-1111-111111111111',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   (NOW() + INTERVAL '3 weeks')::date,
   (NOW() + INTERVAL '3 weeks + 5 days')::date,
   'vacation',
   40,
   'Summer vacation',
   'pending',
   NULL,
   NOW() - INTERVAL '1 day',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   NULL,
   NULL
  );

-- Create test timesheets for sick leave calculation
INSERT INTO public.time_entries (
  organization_id,
  user_id,
  clock_in,
  clock_out,
  status
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (NOW() - INTERVAL '1 month' + (n || ' days')::interval)::timestamp + '09:00:00',
  (NOW() - INTERVAL '1 month' + (n || ' days')::interval)::timestamp + '17:00:00',
  'completed'
FROM generate_series(0, 20) n
WHERE n % 7 < 5; -- Only weekdays

-- Add some test data in another organization for isolation testing
INSERT INTO public.pto_requests (
  id,
  organization_id,
  user_id,
  start_date,
  end_date,
  type,
  hours,
  reason,
  status,
  created_at
)
VALUES
  ('99999999-9999-9999-9999-999999999999',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (NOW() + INTERVAL '1 month')::date,
   (NOW() + INTERVAL '1 month + 1 day')::date,
   'vacation',
   8,
   'Test isolation',
   'pending',
   NOW()
  );
