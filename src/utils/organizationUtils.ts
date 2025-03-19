import { SupabaseClient, User } from '@supabase/supabase-js';

// Default PTO structure used when creating new employees
export const DEFAULT_PTO = {
  annual: 80,
  sick: 40,
  used: 0,
  accrued: 0
};

// Default departments to create for each organization
const DEFAULT_DEPARTMENTS = [
  'Administration',
  'Field Operations',
  'Sales',
  'Customer Service',
  'Finance'
];

// Default service types to create for each organization
const DEFAULT_SERVICE_TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Maintenance',
  'Installation',
  'Repair'
];

/**
 * Fallback method to create an organization without using the transaction function
 * This is used when the transaction function fails due to materialized view issues
 */
export const createOrganizationFallback = async (
  supabase: SupabaseClient,
  name: string,
  currentUser: User
) => {
  console.log('Starting fallback organization creation process...');
  
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Step 1: Try to create the organization using a stored procedure
    // This approach bypasses the RLS policies and materialized view checks
    console.log('Attempting to create organization using direct SQL...');
    
    const { data: orgData, error: orgError } = await supabase.rpc(
      'create_organization_simple',
      {
        p_name: name,
        p_slug: slug,
        p_user_id: currentUser.id
      }
    );

    if (orgError) {
      console.error('Error creating organization via RPC:', orgError);
      throw orgError;
    }

    if (!orgData || !Array.isArray(orgData) || orgData.length === 0) {
      console.error('Invalid response from create_organization_simple:', orgData);
      throw new Error('Failed to create organization: Invalid response');
    }

    const organizationId = orgData[0].organization_id;
    const memberId = orgData[0].member_id;
    
    console.log('Organization created with ID:', organizationId);
    console.log('Member created with ID:', memberId);

    // Step 2: Create default service types
    try {
      const serviceTypeInserts = DEFAULT_SERVICE_TYPES.map(typeName => ({
        name: typeName,
        organization_id: organizationId
      }));

      const { error: serviceTypeError } = await supabase
        .from('service_types')
        .insert(serviceTypeInserts);

      if (serviceTypeError) {
        console.log('Error creating default service types:', serviceTypeError);
        // Continue anyway, this is not critical
      } else {
        console.log('Default service types created successfully');
      }
    } catch (serviceTypeErr) {
      console.log('Error creating service types:', serviceTypeErr);
      // Continue anyway
    }

    // Step 3: Create default departments
    try {
      const departmentInserts = DEFAULT_DEPARTMENTS.map(deptName => ({
        name: deptName,
        organization_id: organizationId
      }));

      const { error: departmentError } = await supabase
        .from('departments')
        .insert(departmentInserts);

      if (departmentError) {
        console.log('Error creating default departments:', departmentError);
        // Continue anyway, this is not critical
      } else {
        console.log('Default departments created successfully');
      }
    } catch (deptErr) {
      console.log('Error creating departments:', deptErr);
      // Continue anyway
    }

    // Step 4: Create employee record
    try {
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          member_id: memberId,
          organization_id: organizationId,
          first_name: currentUser.user_metadata?.first_name || '',
          last_name: currentUser.user_metadata?.last_name || '',
          email: currentUser.email,
          status: 'active',
          role: 'admin',
          start_date: new Date().toISOString().split('T')[0],
          pto: DEFAULT_PTO
        });

      if (employeeError) {
        console.error('Error creating employee record:', employeeError);
        // Continue anyway, not critical
      } else {
        console.log('Employee record created successfully');
      }
    } catch (empErr) {
      console.log('Error creating employee:', empErr);
      // Continue anyway
    }

    // Step 5: Fetch the newly created organization
    const { data: fetchedOrgData, error: fetchOrgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (fetchOrgError) {
      console.error('Error fetching organization:', fetchOrgError);
      // Create a minimal organization object to return
      return {
        organization: {
          id: organizationId,
          name: name,
          slug: slug,
          created_at: new Date().toISOString()
        },
        memberId: memberId
      };
    }
    
    return {
      organization: fetchedOrgData,
      memberId: memberId
    };
  } catch (err) {
    console.error('Error in fallback organization creation:', err);
    throw err;
  }
};
