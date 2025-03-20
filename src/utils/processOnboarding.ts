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

    // Use the RPC function to bypass RLS policies
    try {
      console.log('Creating organization via RPC:', orgName);
      
      // Get user data to pass to the RPC function
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
      
      console.log('Calling create_organization_simple with params:', {
        p_name: orgName,
        p_slug: slug,
        p_user_id: userId,
        p_user_email: userEmail,
        p_first_name: firstName,
        p_last_name: lastName
      });
      
      const orgDataResult = await executeWithRetry(
        async () => {
          const { data, error } = await supabase.rpc(
            'create_organization_simple',
            {
              p_name: orgName,
              p_slug: slug,
              p_user_id: userId,
              p_user_email: userEmail,
              p_first_name: firstName,
              p_last_name: lastName
            }
          );
          return { data, error };
        },
        'Error creating organization via RPC'
      );
      
      if (orgDataResult.error) {
        console.error('Error creating organization via RPC:', orgDataResult.error);
        throw new Error(`Failed to create organization: ${orgDataResult.error.message}`);
      }
      
      const orgData = orgDataResult.data;
      if (!orgData || orgData.length === 0) {
        console.error('No data returned from organization creation RPC');
        throw new Error('No data returned from organization creation');
      }
      
      organizationId = orgData[0].organization_id;
      memberId = orgData[0].member_id;
      console.log('Organization created successfully via RPC:', orgData);
      
      // No need to create employee record separately as it's now included in the RPC function
    } catch (error) {
      console.error('Error creating organization via RPC:', error);
      
      // Fallback to direct insert if RPC fails
      try {
        console.log('Falling back to direct organization creation');
        currentStep = 'creating_organization_fallback';
        
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
            error: 'Error creating organization', 
            step: currentStep 
          };
        }

        const newOrg = newOrgResult.data;
        organizationId = newOrg.id;
        console.log('Organization created with direct insert, ID:', organizationId);

        // Create the organization member using the direct function
        currentStep = 'creating_organization_member';
        const memberResult = await executeWithRetry(
          async () => {
            const { data, error } = await supabase.rpc(
              'direct_create_organization_member',
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
          // Try to clean up the organization if member creation fails
          await supabase.from('organizations').delete().eq('id', organizationId);
          return { 
            success: false, 
            error: 'Error creating organization member', 
            step: currentStep 
          };
        }

        memberId = memberResult.data;
        console.log('Member created with ID:', memberId);
        
        // Create an employee record for the user using the direct function
        try {
          console.log('Creating employee record for user:', userId);
          currentStep = 'creating_employee';
          
          // Get user data
          const userDataResult = await executeWithRetry(
            async () => {
              const { data, error } = await supabase.auth.getUser();
              return { data, error };
            },
            'Error getting user data'
          );
          
          if (userDataResult.error) {
            console.error('Error getting user data:', userDataResult.error);
            // Continue with the process even if employee creation fails
          } else {
            const userData = userDataResult.data;
            const userEmail = userData.user?.email || '';
            const firstName = state.admin?.firstName || '';
            const lastName = state.admin?.lastName || '';
            
            // Create employee record - only if we have a valid organizationId and memberId
            if (organizationId && memberId) {
              const employeeResult = await executeWithRetry(
                async () => {
                  const { data, error } = await supabase.rpc(
                    'direct_create_employee',
                    {
                      p_organization_id: organizationId,
                      p_member_id: memberId,
                      p_email: userEmail,
                      p_first_name: firstName,
                      p_last_name: lastName,
                      p_role: 'admin'
                    }
                  );
                  return { data, error };
                },
                'Error creating employee record'
              );
              
              if (employeeResult.error) {
                console.error('Error creating employee record:', employeeResult.error);
                // Continue with the process even if employee creation fails
              } else {
                console.log('Employee record created successfully:', employeeResult.data);
              }
            } else {
              console.error('Cannot create employee record: Missing organization ID or member ID');
            }
          }
        } catch (err) {
          console.error('Error in employee creation process:', err);
          // Continue with the process even if employee creation fails
        }
      } catch (fallbackError) {
        console.error('Fallback organization creation failed:', fallbackError);
        return { 
          success: false, 
          error: 'Error creating organization', 
          step: currentStep 
        };
      }
    }

    if (!organizationId) {
      return {
        success: false,
        error: 'Failed to create organization: No organization ID was generated',
        step: currentStep
      };
    }

    // Create departments using the RPC function
    currentStep = 'creating_departments';
    const departmentNames = state.team?.departments?.map((dept: any) => 
      typeof dept === 'string' ? dept : dept.name
    ) || [];
    
    if (departmentNames.length > 0) {
      console.log('Creating departments:', departmentNames);
      
      try {
        // Check for existing departments first
        const { data: existingDepts, error: deptCheckError } = await supabase
          .from('departments')
          .select('name')
          .eq('organization_id', organizationId);
        
        if (deptCheckError) {
          console.error('Error checking existing departments:', deptCheckError);
        }
        
        // Filter out departments that already exist
        const existingDeptNames = existingDepts?.map(d => d.name.toLowerCase()) || [];
        const newDepartments = departmentNames.filter(
          name => !existingDeptNames.includes(name.toLowerCase())
        );
        
        if (newDepartments.length > 0) {
          const deptResult = await executeWithRetry(
            async () => {
              const { error } = await supabase.rpc(
                'create_departments_for_organization',
                {
                  p_organization_id: organizationId as string,
                  p_department_names: newDepartments
                }
              );
              return { error };
            },
            'Error creating departments via RPC'
          );
          
          if (deptResult.error) {
            console.error('Error creating departments via RPC:', deptResult.error);
            
            // Fallback: Try direct insert
            try {
              currentStep = 'creating_departments_fallback';
              const departmentInserts = newDepartments.map((name: string) => ({
                name,
                organization_id: organizationId
              }));
              
              const directDeptResult = await executeWithRetry(
                async () => {
                  const { error } = await supabase
                    .from('departments')
                    .insert(departmentInserts);
                  return { error };
                },
                'Error creating departments directly'
              );
              
              if (directDeptResult.error) {
                console.error('Error creating departments directly:', directDeptResult.error);
              } else {
                console.log('Departments created successfully via direct insert');
              }
            } catch (err) {
              console.error('Error in fallback department creation:', err);
            }
          } else {
            console.log('Departments created successfully via RPC');
          }
        } else {
          console.log('All departments already exist, skipping creation');
        }
      } catch (err) {
        console.error('Error in department creation process:', err);
        // Continue with the process even if department creation fails
      }
    } else {
      // Create default departments if none specified
      const defaultDepartments = ['Administration', 'Field Operations', 'Sales'];
      console.log('Creating default departments:', defaultDepartments);
      
      try {
        // Check for existing departments first
        const { data: existingDepts, error: deptCheckError } = await supabase
          .from('departments')
          .select('name')
          .eq('organization_id', organizationId);
        
        if (deptCheckError) {
          console.error('Error checking existing departments:', deptCheckError);
        }
        
        // Filter out departments that already exist
        const existingDeptNames = existingDepts?.map(d => d.name.toLowerCase()) || [];
        const newDepartments = defaultDepartments.filter(
          name => !existingDeptNames.includes(name.toLowerCase())
        );
        
        if (newDepartments.length > 0) {
          const deptResult = await executeWithRetry(
            async () => {
              const { error } = await supabase.rpc(
                'create_departments_for_organization',
                {
                  p_organization_id: organizationId as string,
                  p_department_names: newDepartments
                }
              );
              return { error };
            },
            'Error creating default departments via RPC'
          );
          
          if (deptResult.error) {
            console.error('Error creating default departments via RPC:', deptResult.error);
          } else {
            console.log('Default departments created successfully via RPC');
          }
        } else {
          console.log('All default departments already exist, skipping creation');
        }
      } catch (err) {
        console.error('Error creating default departments:', err);
      }
    }

    // Create service types using the RPC function
    currentStep = 'creating_service_types';
    const serviceTypeNames = state.team?.serviceTypes?.map((type: any) => 
      typeof type === 'string' ? type : type.name
    ) || [];
    
    if (serviceTypeNames.length > 0) {
      console.log('Creating service types:', serviceTypeNames);
      
      try {
        // Check for existing service types first
        const { data: existingTypes, error: typeCheckError } = await supabase
          .from('service_types')
          .select('name')
          .eq('organization_id', organizationId);
        
        if (typeCheckError) {
          console.error('Error checking existing service types:', typeCheckError);
        }
        
        // Filter out service types that already exist
        const existingTypeNames = existingTypes?.map(t => t.name.toLowerCase()) || [];
        const newServiceTypes = serviceTypeNames.filter(
          name => !existingTypeNames.includes(name.toLowerCase())
        );
        
        if (newServiceTypes.length > 0) {
          const typeResult = await executeWithRetry(
            async () => {
              const { error } = await supabase.rpc(
                'create_service_types_for_organization',
                {
                  p_organization_id: organizationId as string,
                  p_service_type_names: newServiceTypes
                }
              );
              return { error };
            },
            'Error creating service types via RPC'
          );
          
          if (typeResult.error) {
            console.error('Error creating service types via RPC:', typeResult.error);
            
            // Fallback: Try direct insert
            try {
              currentStep = 'creating_service_types_fallback';
              const serviceTypeInserts = newServiceTypes.map((name: string) => ({
                name,
                organization_id: organizationId
              }));
              
              const directTypeResult = await executeWithRetry(
                async () => {
                  const { error } = await supabase
                    .from('service_types')
                    .insert(serviceTypeInserts);
                  return { error };
                },
                'Error creating service types directly'
              );
              
              if (directTypeResult.error) {
                console.error('Error creating service types directly:', directTypeResult.error);
              } else {
                console.log('Service types created successfully via direct insert');
              }
            } catch (err) {
              console.error('Error in fallback service type creation:', err);
            }
          } else {
            console.log('Service types created successfully via RPC');
          }
        } else {
          console.log('All service types already exist, skipping creation');
        }
      } catch (err) {
        console.error('Error in service type creation process:', err);
        // Continue with the process even if service type creation fails
      }
    } else {
      // Create default service types if none specified
      const defaultServiceTypes = ['Standard', 'Premium'];
      console.log('Creating default service types:', defaultServiceTypes);
      
      try {
        // Check for existing service types first
        const { data: existingTypes, error: typeCheckError } = await supabase
          .from('service_types')
          .select('name')
          .eq('organization_id', organizationId);
        
        if (typeCheckError) {
          console.error('Error checking existing service types:', typeCheckError);
        }
        
        // Filter out service types that already exist
        const existingTypeNames = existingTypes?.map(t => t.name.toLowerCase()) || [];
        const newServiceTypes = defaultServiceTypes.filter(
          name => !existingTypeNames.includes(name.toLowerCase())
        );
        
        if (newServiceTypes.length > 0) {
          const typeResult = await executeWithRetry(
            async () => {
              const { error } = await supabase.rpc(
                'create_service_types_for_organization',
                {
                  p_organization_id: organizationId as string,
                  p_service_type_names: newServiceTypes
                }
              );
              return { error };
            },
            'Error creating default service types via RPC'
          );
          
          if (typeResult.error) {
            console.error('Error creating default service types via RPC:', typeResult.error);
          } else {
            console.log('Default service types created successfully via RPC');
          }
        } else {
          console.log('All default service types already exist, skipping creation');
        }
      } catch (err) {
        console.error('Error creating default service types:', err);
      }
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
