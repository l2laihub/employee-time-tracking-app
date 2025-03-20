import { supabase } from '../lib/supabase';
import { OnboardingState as AppOnboardingState } from '../components/onboarding/types';

/**
 * Process the onboarding data after email confirmation
 * Creates the organization, departments, and service types
 */
export interface OnboardingState {
  organization: {
    name: string;
    industry?: string;
    size?: string;
  };
  team: {
    departments?: (string | { name: string })[];
    serviceTypes?: (string | { name: string })[];
  };
  admin: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  expiresAt?: string;
}

// Maximum number of retry attempts for database operations
const MAX_RETRIES = 3;
// Delay between retries in milliseconds
const RETRY_DELAY = 1000;

/**
 * Helper function to add delay between retries
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to execute a database operation with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`${errorMessage} (Attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        await delay(RETRY_DELAY * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw new Error(`${errorMessage} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Process the onboarding data to create organization and related entities
 */
export const processOnboarding = async (userId: string): Promise<{ 
  success: boolean; 
  error?: string; 
  organizationId?: string; 
  message?: string;
  step?: string;
}> => {
  let currentStep = 'initializing';
  let organizationId: string | undefined;
  let memberId: string | undefined;
  
  try {
    // Get the saved onboarding state
    currentStep = 'loading_data';
    const onboardingState = localStorage.getItem('onboardingState');
    if (!onboardingState) {
      console.error('No onboarding state found');
      return { success: false, error: 'No onboarding state found', step: currentStep };
    }

    // Try to parse the state, if it fails, clear it and return an error
    let state: AppOnboardingState;
    try {
      state = JSON.parse(onboardingState);
    } catch (parseError) {
      console.error('Error parsing onboarding state:', parseError);
      clearOnboardingState();
      return { 
        success: false, 
        error: 'Invalid onboarding data format. Please start the onboarding process again.', 
        step: 'invalid_format' 
      };
    }
    
    // Check if the state has the expected structure
    if (!state || typeof state !== 'object') {
      console.error('Invalid onboarding state format');
      clearOnboardingState();
      return { 
        success: false, 
        error: 'Invalid onboarding data format. Please start the onboarding process again.', 
        step: 'invalid_format' 
      };
    }
    
    // Check if onboarding data has expired
    if (state.expiresAt) {
      try {
        const expirationDate = new Date(state.expiresAt);
        if (expirationDate < new Date()) {
          console.error('Onboarding data has expired');
          clearOnboardingState();
          return { 
            success: false, 
            error: 'Your onboarding data has expired. Please start the onboarding process again.', 
            step: 'expired' 
          };
        }
      } catch (dateError) {
        console.error('Error parsing expiration date:', dateError);
        clearOnboardingState();
        return { 
          success: false, 
          error: 'Invalid expiration date format. Please start the onboarding process again.', 
          step: 'invalid_date' 
        };
      }
    }
    
    if (!state.organization?.name) {
      console.error('No organization name found in onboarding state');
      clearOnboardingState();
      return { 
        success: false, 
        error: 'No organization name found in onboarding state. Please start the onboarding process again.', 
        step: currentStep 
      };
    }

    // First, check if the user already has an organization
    currentStep = 'checking_existing_organization';
    const existingMembershipsResult = await executeWithRetry(
      async () => {
        const { data, error } = await supabase
          .from('organization_members')
          .select('organization_id, id')
          .eq('user_id', userId);
        return { data, error };
      },
      'Error checking existing memberships'
    );
    
    if (existingMembershipsResult.error) {
      console.error('Error checking existing memberships:', existingMembershipsResult.error);
      return { 
        success: false, 
        error: 'Error checking existing memberships', 
        step: currentStep 
      };
    } 
    
    // Filter out any memberships with null organization_id
    const existingMemberships = (existingMembershipsResult.data || [])
      .filter(m => m.organization_id);
    
    if (existingMemberships.length > 0) {
      // User already has an organization, skip creation
      console.log('User already has an organization, skipping creation');
      
      // Clear the onboarding state to prevent future attempts
      clearOnboardingState();
      
      return { 
        success: true, 
        organizationId: existingMemberships[0].organization_id,
        message: 'User already has an organization',
        step: 'existing_organization'
      };
    }

    // Create the organization
    currentStep = 'creating_organization';
    const orgName = state.organization.name;
    const timestamp = Date.now();
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + timestamp;

    // Get user data to pass to the function
    const userDataResult = await executeWithRetry(
      async () => {
        const { data, error } = await supabase.auth.getUser();
        return { data, error };
      },
      'Error getting user data'
    );
    
    if (userDataResult.error) {
      console.error('Error getting user data:', userDataResult.error);
      return { 
        success: false, 
        error: 'Error getting user data', 
        step: currentStep 
      };
    }
    
    const userData = userDataResult.data;
    const userEmail = userData.user?.email || '';
    const firstName = state.admin?.firstName || '';
    const lastName = state.admin?.lastName || '';

    // Use the bypass function to create everything in one go
    console.log('Using bypass function to create organization');
    const bypassResult = await executeWithRetry(
      async () => {
        const { data, error } = await supabase.rpc(
          'bypass_create_complete_organization',
          {
            p_org_name: orgName,
            p_user_id: userId,
            p_user_email: userEmail,
            p_first_name: firstName,
            p_last_name: lastName
          }
        );
        return { data, error };
      },
      'Error creating organization via bypass function'
    );
    
    if (bypassResult.error) {
      console.error('Error creating organization via bypass function:', bypassResult.error);
      
      // Try one more approach - create organization directly
      console.log('Attempting direct table insert as last resort');
      
      // Create the organization directly
      const newOrgResult = await executeWithRetry(
        async () => {
          const { data, error } = await supabase
            .from('organizations')
            .insert({
              name: orgName,
              slug: slug
            })
            .select()
            .single();
          return { data, error };
        },
        'Error creating organization with direct insert'
      );

      if (newOrgResult.error) {
        console.error('Error creating organization with direct insert:', newOrgResult.error);
        return { 
          success: false, 
          error: 'Error creating organization: ' + newOrgResult.error.message, 
          step: currentStep 
        };
      }

      const newOrg = newOrgResult.data;
      organizationId = newOrg.id;
      console.log('Organization created with direct insert, ID:', organizationId);

      // Create the organization member using the bypass function
      currentStep = 'creating_organization_member';
      const memberResult = await executeWithRetry(
        async () => {
          const { data, error } = await supabase.rpc(
            'bypass_create_organization_member',
            {
              p_organization_id: organizationId,
              p_user_id: userId,
              p_role: 'admin'
            }
          );
          return { data, error };
        },
        'Error creating organization member'
      );

      if (memberResult.error) {
        console.error('Error creating organization member:', memberResult.error);
        // Don't try to clean up the organization - it might be used by other members
        return { 
          success: false, 
          error: 'Error creating organization member: ' + memberResult.error.message, 
          step: currentStep 
        };
      }

      memberId = memberResult.data;
      console.log('Member created with ID:', memberId);
      
      // Create an employee record for the user
      try {
        console.log('Creating employee record for user:', userId);
        currentStep = 'creating_employee';
        
        // Create employee record - only if we have a valid organizationId and memberId
        if (organizationId && memberId) {
          // Use direct table insert as last resort
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .insert({
              organization_id: organizationId,
              member_id: memberId,
              email: userEmail,
              first_name: firstName,
              last_name: lastName,
              role: 'admin',
              status: 'active',
              start_date: new Date().toISOString().split('T')[0],
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
            })
            .select();
          
          if (employeeError) {
            console.error('Error creating employee record:', employeeError);
            // Continue with the process even if employee creation fails
          } else {
            console.log('Employee record created successfully:', employeeData);
          }
        } else {
          console.error('Cannot create employee record: Missing organization ID or member ID');
        }
      } catch (err) {
        console.error('Error in employee creation process:', err);
        // Continue with the process even if employee creation fails
      }
      
      // Create default departments
      try {
        const defaultDepartments = ['Administration', 'Field Operations', 'Sales'];
        console.log('Creating default departments:', defaultDepartments);
        
        const departmentInserts = defaultDepartments.map(name => ({
          name,
          organization_id: organizationId
        }));
        
        const { error: deptError } = await supabase
          .from('departments')
          .insert(departmentInserts);
        
        if (deptError) {
          console.error('Error creating default departments:', deptError);
        } else {
          console.log('Default departments created successfully');
        }
      } catch (err) {
        console.error('Error creating default departments:', err);
      }
      
      // Create default service types
      try {
        const defaultServiceTypes = ['Standard', 'Premium'];
        console.log('Creating default service types:', defaultServiceTypes);
        
        const serviceTypeInserts = defaultServiceTypes.map(name => ({
          name,
          organization_id: organizationId
        }));
        
        const { error: typeError } = await supabase
          .from('service_types')
          .insert(serviceTypeInserts);
        
        if (typeError) {
          console.error('Error creating default service types:', typeError);
        } else {
          console.log('Default service types created successfully');
        }
      } catch (err) {
        console.error('Error creating default service types:', err);
      }
    } else {
      // Bypass function succeeded
      const bypassData = bypassResult.data;
      if (!bypassData || bypassData.length === 0) {
        console.error('No data returned from bypass function');
        return {
          success: false,
          error: 'Failed to create organization: No data returned',
          step: currentStep
        };
      }
      
      organizationId = bypassData[0].organization_id;
      memberId = bypassData[0].member_id;
      console.log('Organization created successfully via bypass function:', bypassData);
    }

    // Clear the onboarding state
    clearOnboardingState();
    currentStep = 'completed';

    return { success: true, organizationId, step: currentStep };
  } catch (error) {
    console.error('Error processing onboarding:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      step: currentStep
    };
  }
};

/**
 * Clear the onboarding state from localStorage and sessionStorage
 */
export const clearOnboardingState = (): void => {
  localStorage.removeItem('onboardingState');
  sessionStorage.removeItem('onboarding_password');
};

/**
 * Check if there is pending onboarding data
 * Also checks if the data has expired
 */
export const hasPendingOnboarding = (): boolean => {
  try {
    const onboardingState = localStorage.getItem('onboardingState');
    if (!onboardingState) return false;

    // Try to parse the state, if it fails, clear it and return false
    let state;
    try {
      state = JSON.parse(onboardingState);
    } catch (parseError) {
      console.error('Error parsing onboarding state:', parseError);
      clearOnboardingState();
      return false;
    }
    
    // Check if the state has the expected structure
    if (!state || typeof state !== 'object') {
      console.log('Invalid onboarding state format, clearing...');
      clearOnboardingState();
      return false;
    }
    
    // Check if the onboarding data is submitted
    if (state.submitted !== true) {
      console.log('Onboarding data not submitted, clearing...');
      clearOnboardingState();
      return false;
    }
    
    // Check if the onboarding data has expired
    if (state.expiresAt) {
      try {
        const expirationDate = new Date(state.expiresAt);
        if (expirationDate < new Date()) {
          console.log('Onboarding data has expired, clearing...');
          clearOnboardingState();
          return false;
        }
      } catch (dateError) {
        console.error('Error parsing expiration date:', dateError);
        clearOnboardingState();
        return false;
      }
    }
    
    // Check if the state has the required organization data
    if (!state.organization || !state.organization.name) {
      console.log('Missing organization data in onboarding state, clearing...');
      clearOnboardingState();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking for pending onboarding:', error);
    clearOnboardingState();
    return false;
  }
};
