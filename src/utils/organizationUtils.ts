import { SupabaseClient, User } from '@supabase/supabase-js';

// Default PTO structure used when creating new employees
export const DEFAULT_PTO = {
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
  'Standard',
  'Premium'
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
    // Generate a unique slug with timestamp to avoid conflicts
    const timestamp = Date.now();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    
    // Check if user already has an organization
    console.log('Checking if user already has an organization...');
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('id, organization_id')
      .eq('user_id', currentUser.id);
    
    if (membershipError) {
      console.error('Error checking existing memberships:', membershipError);
      throw membershipError;
    }
    
    // Filter out any memberships with null organization_id
    const validMemberships = (existingMemberships || []).filter(m => m.organization_id);
    
    if (validMemberships.length > 0) {
      console.log('User already has an organization, fetching details...');
      
      // Fetch the existing organization
      const { data: existingOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', validMemberships[0].organization_id)
        .single();
      
      if (orgError) {
        console.error('Error fetching existing organization:', orgError);
        throw orgError;
      }
      
      console.log('Returning existing organization:', existingOrg);
      return {
        organization: existingOrg,
        memberId: validMemberships[0].id
      };
    }
    
    // Step 1: Create the organization directly
    console.log('Creating new organization with name:', name);
    
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name,
        slug: slug
      })
      .select()
      .single();
    
    if (orgError) {
      console.error('Error creating organization:', orgError);
      throw orgError;
    }
    
    const organizationId = newOrg.id;
    console.log('Organization created with ID:', organizationId);
    
    // Step 2: Create organization member
    console.log('Creating organization member for user:', currentUser.id);
    
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: currentUser.id,
        role: 'admin'
      })
      .select()
      .single();
    
    if (memberError) {
      console.error('Error creating organization member:', memberError);
      // Try to clean up the organization
      await supabase.from('organizations').delete().eq('id', organizationId);
      throw memberError;
    }
    
    const memberId = member.id;
    console.log('Member created with ID:', memberId);
    
    // Step 3: Create default service types
    try {
      console.log('Creating default service types...');
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

    // Step 4: Create default departments
    try {
      console.log('Creating default departments...');
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

    // Step 5: Create employee record
    try {
      console.log('Creating employee record...');
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

    return {
      organization: newOrg,
      memberId: memberId
    };
  } catch (err) {
    console.error('Error in fallback organization creation:', err);
    throw err;
  }
};
