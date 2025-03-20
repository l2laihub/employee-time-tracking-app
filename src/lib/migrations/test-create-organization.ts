import { supabase } from '../supabase';

/**
 * Test script to create an organization directly using the RPC function
 */
async function testCreateOrganization() {
  try {
    console.log('Testing organization creation via RPC...');
    
    // Replace with the actual user ID you want to create an organization for
    const userId = '904e8e7e-57b0-4a32-bc5f-4ef587481913'; // lovetolearn1149@gmail.com
    
    const orgName = 'Test Organization';
    const timestamp = Date.now();
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + timestamp;
    
    console.log(`Creating organization "${orgName}" with slug "${slug}" for user ${userId}`);
    
    // Call the RPC function
    const { data: orgData, error: orgError } = await supabase.rpc(
      'create_organization_simple',
      {
        p_name: orgName,
        p_slug: slug,
        p_user_id: userId
      }
    );
    
    if (orgError) {
      console.error('Error creating organization via RPC:', orgError);
      process.exit(1);
    }
    
    console.log('Organization created successfully:', orgData);
    
    // Create an employee record for the user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user data:', userError);
      process.exit(1);
    }
    
    if (!userData.user) {
      console.error('No authenticated user found');
      process.exit(1);
    }
    
    // Create employee record
    const employeeData = {
      organization_id: orgData[0].organization_id,
      user_id: userId,
      first_name: '',
      last_name: '',
      email: 'lovetolearn1149@gmail.com',
      role: 'admin',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      pto: {
        vacation: {
          beginningBalance: 0,
          ongoingBalance: 0,
          firstYearRule: 40,
          used: 0
        },
        sickLeave: {
          beginningBalance: 0,
          used: 0
        }
      }
    };
    
    console.log('Creating employee record:', employeeData);
    
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();
    
    if (employeeError) {
      console.error('Error creating employee record:', employeeError);
      process.exit(1);
    }
    
    console.log('Employee record created successfully:', employee);
    
    // Create default departments
    const defaultDepartments = ['Administration', 'Field Operations', 'Sales'];
    console.log('Creating default departments:', defaultDepartments);
    
    const { error: deptError } = await supabase.rpc(
      'create_departments_for_organization',
      {
        p_organization_id: orgData[0].organization_id,
        p_department_names: defaultDepartments
      }
    );
    
    if (deptError) {
      console.error('Error creating departments:', deptError);
    } else {
      console.log('Departments created successfully');
    }
    
    // Create default service types
    const defaultServiceTypes = ['Consulting', 'Maintenance', 'Installation'];
    console.log('Creating default service types:', defaultServiceTypes);
    
    const serviceTypeInserts = defaultServiceTypes.map(name => ({
      name,
      organization_id: orgData[0].organization_id
    }));
    
    const { error: serviceTypeError } = await supabase
      .from('service_types')
      .insert(serviceTypeInserts);
    
    if (serviceTypeError) {
      console.error('Error creating service types:', serviceTypeError);
    } else {
      console.log('Service types created successfully');
    }
    
    console.log('Organization setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error in test script:', error);
    process.exit(1);
  }
}

// Run the test
testCreateOrganization();
