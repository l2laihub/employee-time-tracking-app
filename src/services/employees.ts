import { supabase } from '../lib/supabase';
import type { Employee } from '../lib/types';
import type { PostgrestError } from '@supabase/supabase-js';

interface RPCError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface RPCResponse<T> {
  data: T[] | null;
  error: RPCError | null;
}

export interface EmployeeResult {
  success: boolean;
  data?: Employee | Employee[];
  error?: string;
}

// Default PTO structure
const DEFAULT_PTO = {
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

export async function createEmployee(
  organizationId: string,
  employeeData: Omit<Employee, 'id'>
): Promise<EmployeeResult> {
  // Ensure PTO structure is properly initialized
  const pto = {
    vacation: {
      ...DEFAULT_PTO.vacation,
      ...employeeData.pto?.vacation
    },
    sickLeave: {
      ...DEFAULT_PTO.sickLeave,
      ...employeeData.pto?.sickLeave
    }
  };
  try {
    let memberId: string | null = null;
    
    // Only try to get member_id if we're in an authenticated context
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .single();
        memberId = memberData?.id || null;
      }
    } catch (error) {
      console.log('No authenticated user or member found:', error);
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employeeData,
        organization_id: organizationId,
        member_id: memberId,
        pto // Use the properly initialized PTO structure from above
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Employee
    };
  } catch (error) {
    console.error('Employee creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateEmployee(
  employeeId: string,
  updates: Partial<Employee>
): Promise<EmployeeResult> {
  try {
    console.log('Debug - Updating employee:', {
      employeeId,
      updates
    });

    // Ensure PTO structure is properly initialized if included
    if (updates.pto) {
      updates.pto = {
        vacation: {
          ...DEFAULT_PTO.vacation,
          ...updates.pto.vacation
        },
        sickLeave: {
          ...DEFAULT_PTO.sickLeave,
          ...updates.pto.sickLeave
        }
      };
    }

    // Get current session without forcing refresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Failed to get current session:', sessionError);
      return {
        success: false,
        error: 'No active session found'
      };
    }
    const user = session.user;

    // Check if this is the current user's employee record
    const { data: employeeData } = await supabase
      .from('employees')
      .select('email')
      .eq('id', employeeId)
      .single();

    // No longer updating auth metadata since we're using employee table as source of truth

    // Separate PTO updates from basic info
    const { pto, ...basicInfo } = updates;

    console.log('Updating employee basic info:', {
      employeeId,
      basicInfo
    });

    // First update PTO if needed
    if (pto) {
      const { error: ptoError } = await supabase
        .rpc('update_employee_pto', {
          employee_id: employeeId,
          new_pto: pto
        });

      if (ptoError) {
        console.error('PTO update failed:', ptoError);
        return {
          success: false,
          error: String(ptoError)
        };
      }
    }

    // Determine if this is a user settings update or admin employee update
    const isUserSettingsUpdate = Object.keys(basicInfo).every(key =>
      ['first_name', 'last_name', 'email', 'phone'].includes(key)
    );

    let updatedEmployee;
    let updateError;

    if (isUserSettingsUpdate) {
      // Use user self-update function for user settings
      const { data, error } = await supabase
        .rpc('update_user_basic_info', {
          employee_id: employeeId,
          new_first_name: basicInfo.first_name || undefined,
          new_last_name: basicInfo.last_name || undefined,
          new_email: basicInfo.email || undefined,
          new_phone: basicInfo.phone || null
        });
      updatedEmployee = data;
      updateError = error;
    } else {
      // Use admin update function for full employee updates
      const startDate = basicInfo.start_date ? new Date(basicInfo.start_date).toISOString().split('T')[0] : undefined;
      const { data, error } = await supabase
        .rpc('update_employee_basic_info', {
          employee_id: employeeId,
          new_first_name: basicInfo.first_name || undefined,
          new_last_name: basicInfo.last_name || undefined,
          new_email: basicInfo.email || undefined,
          new_phone: basicInfo.phone || null,
          new_department: basicInfo.department || undefined,
          new_start_date: startDate,
          new_role: basicInfo.role || undefined,
          new_status: basicInfo.status || undefined,
          new_pto: null // We handle PTO updates separately
        });
      updatedEmployee = data;
      updateError = error;
    }

    if (updateError) {
      console.error('Employee basic info update failed:', updateError);
      return {
        success: false,
        error: String(updateError)
      };
    }

    if (!updatedEmployee || !Array.isArray(updatedEmployee) || updatedEmployee.length === 0) {
      console.error('No employee data returned after update');
      return {
        success: false,
        error: 'Employee not found or permission denied'
      };
    }

    // RPC function returns an array with one element
    const employee = updatedEmployee[0];

    // Dispatch event to notify components of the update
    window.dispatchEvent(new Event('employee-updated'));

    return {
      success: true,
      data: employee as Employee
    };
  } catch (error) {
    console.error('Employee update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listEmployees(organizationId: string): Promise<EmployeeResult> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        organization_members (
          id,
          user_id,
          role
        )
      `)
      .eq('organization_id', organizationId)
      .order('last_name', { ascending: true });

    if (error) throw error;

    // Ensure all employees have proper PTO structure
    const employeesWithPTO = data?.map(employee => ({
      ...employee,
      pto: {
        vacation: {
          ...DEFAULT_PTO.vacation,
          ...employee.pto?.vacation
        },
        sickLeave: {
          ...DEFAULT_PTO.sickLeave,
          ...employee.pto?.sickLeave
        }
      }
    }));

    return {
      success: true,
      data: employeesWithPTO as Employee[]
    };
  } catch (error) {
    console.error('Listing employees failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getEmployee(employeeId: string): Promise<EmployeeResult> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        organization_members (
          id,
          user_id,
          role
        )
      `)
      .eq('id', employeeId)
      .single();

    if (error) throw error;

    // Ensure employee has proper PTO structure
    const employeeWithPTO = {
      ...data,
      pto: {
        vacation: {
          ...DEFAULT_PTO.vacation,
          ...data.pto?.vacation
        },
        sickLeave: {
          ...DEFAULT_PTO.sickLeave,
          ...data.pto?.sickLeave
        }
      }
    };

    return {
      success: true,
      data: employeeWithPTO as Employee
    };
  } catch (error) {
    console.error('Getting employee failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getEmployeesByDepartment(
  organizationId: string,
  department: string
): Promise<EmployeeResult> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        organization_members (
          id,
          user_id,
          role
        )
      `)
      .eq('organization_id', organizationId)
      .eq('department', department)
      .order('last_name', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data as Employee[]
    };
  } catch (error) {
    console.error('Getting employees by department failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateEmployeePTO(
  employeeId: string,
  ptoUpdates: Employee['pto']
): Promise<EmployeeResult> {
  try {
    console.log('Updating PTO settings:', {
      employeeId,
      ptoUpdates
    });

    const { data, error } = await supabase
      .rpc('update_employee_pto', {
        employee_id: employeeId,
        new_pto: ptoUpdates
      });

    if (error) {
      console.error('PTO update failed:', error);
      throw error;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No employee data returned after update');
    }

    // RPC function returns an array with one element
    const employee = data[0];
    console.log('PTO update successful:', employee);

    return {
      success: true,
      data: employee as Employee
    };
  } catch (error) {
    console.error('PTO update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function importEmployees(
  organizationId: string,
  employees: Omit<Employee, 'id'>[]
): Promise<EmployeeResult[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get member_id for the current user in this organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      throw new Error('User is not a member of this organization');
    }

    // Check for existing employees with the same email in this organization only
    const emails = employees.map(emp => emp.email);
    console.log('Checking for existing employees with emails in this organization:', emails);
    
    const { data: existingEmployees, error: existingError } = await supabase
      .from('employees')
      .select('id, email, status, organization_id')
      .in('email', emails)
      .eq('organization_id', organizationId);

    if (existingError) {
      console.error('Error checking existing employees:', existingError);
      throw existingError;
    }

    console.log('Found existing employees in this organization:', existingEmployees);

    // Separate active and inactive employees
    const activeEmails = existingEmployees
      ?.filter(emp => emp.status === 'active')
      .map(emp => emp.email) || [];
    
    const inactiveEmployees = existingEmployees
      ?.filter(emp => emp.status === 'inactive') || [];
    
    console.log('Active emails in this organization:', activeEmails);
    console.log('Inactive employees in this organization:', inactiveEmployees);

    // Prepare data for insert and update
    const newEmployees = employees.filter(emp => 
      !existingEmployees?.some(existing => existing.email === emp.email)
    );

    const reactivateEmployees = employees.filter(emp =>
      inactiveEmployees.some(inactive => inactive.email === emp.email)
    );

    const skippedEmails = activeEmails;

    console.log('New employees to insert:', newEmployees);
    console.log('Employees to reactivate:', reactivateEmployees);
    console.log('Skipped employees (already active in this organization):', skippedEmails);

    const results: EmployeeResult[] = [];

    // Insert new employees
    if (newEmployees.length > 0) {
      const employeesWithOrg = newEmployees.map(employee => ({
        ...employee,
        organization_id: organizationId,
        member_id: member.id,
        status: 'active',
        pto: {
          vacation: {
            beginningBalance: employee.pto?.vacation?.beginningBalance || 0,
            ongoingBalance: 0,
            firstYearRule: 40,
            used: 0
          },
          sickLeave: {
            beginningBalance: employee.pto?.sickLeave?.beginningBalance || 0,
            used: 0
          }
        }
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('employees')
        .insert(employeesWithOrg)
        .select();

      if (insertError) {
        console.error('Error inserting new employees:', insertError);
        throw insertError;
      }
      console.log('Successfully inserted new employees:', insertedData);
      results.push(...(insertedData || []).map(emp => ({ success: true, data: emp as Employee })));
    }

    // Reactivate and update inactive employees
    for (const employee of reactivateEmployees) {
      const existingEmployee = inactiveEmployees.find(inactive => inactive.email === employee.email);
      if (!existingEmployee) continue;

      console.log('Reactivating employee:', existingEmployee.email);

      // First update basic info
      const startDate = employee.start_date ? new Date(employee.start_date).toISOString().split('T')[0] : undefined;
      const { data: updatedData, error: updateError } = await supabase
        .rpc('update_employee_basic_info', {
          employee_id: existingEmployee.id,
          new_first_name: employee.first_name || undefined,
          new_last_name: employee.last_name || undefined,
          new_email: employee.email || undefined,
          new_phone: employee.phone || null,
          new_department: employee.department || undefined,
          new_start_date: startDate,
          new_role: employee.role || undefined,
          new_status: 'active',
          new_pto: null
        });

      // Then update PTO
      if (!updateError) {
        const { error: ptoError } = await supabase
          .rpc('update_employee_pto', {
            employee_id: existingEmployee.id,
            new_pto: {
              vacation: {
                beginningBalance: employee.pto?.vacation?.beginningBalance || 0,
                ongoingBalance: 0,
                firstYearRule: 40,
                used: 0
              },
              sickLeave: {
                beginningBalance: employee.pto?.sickLeave?.beginningBalance || 0,
                used: 0
              }
            }
          });

        if (ptoError) {
          console.error('Error updating PTO for reactivated employee:', ptoError);
          throw ptoError;
        }
      }

      if (updateError) {
        console.error('Error reactivating employee:', updateError);
        throw updateError;
      }
      
      if (updatedData) {
        console.log('Successfully reactivated employee:', updatedData);
        results.push({ success: true, data: updatedData as Employee });
      }
    }

    // Add information about skipped employees
    if (skippedEmails.length > 0) {
      results.push({
        success: false,
        error: `The following employees were skipped (already active in this organization): ${skippedEmails.join(', ')}`
      });
    }

    // If no employees were processed at all
    if (results.length === 0) {
      throw new Error('No employees were imported or reactivated');
    }

    return results;
  } catch (error) {
    console.error('Failed to import employees:', error);
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import employees'
    }];
  }
}

export async function getEmployeeByUserId(userId: string, organizationId?: string): Promise<EmployeeResult> {
  try {
    console.log('Getting employee by user ID:', userId, 'Organization ID:', organizationId);

    // First get user's email from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      console.error('User not found:', userError);
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Get the employee record
    const result = await getEmployeeByEmail(user.email, organizationId);
    return result;
  } catch (error) {
    console.error('Getting employee by user ID failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getEmployeeByEmail(email: string, organizationId?: string): Promise<EmployeeResult> {
  try {
    console.log('Getting employee by email:', email, 'Organization ID:', organizationId);

    // Get the employee record with organization member data
    const query = supabase
      .from('employees')
      .select(`
        *,
        organization_members!inner (
          id,
          user_id,
          role
        )
      `)
      .eq('email', email);
    
    // Add organization filter if provided
    if (organizationId) {
      query.eq('organization_id', organizationId);
    }

    const { data: employeeData, error: employeeError } = await query.maybeSingle();

    if (employeeError) {
      console.error('Getting employee failed:', employeeError);
      return {
        success: false,
        error: employeeError instanceof Error ? employeeError.message : 'Unknown error occurred'
      };
    }

    if (!employeeData) {
      console.log('No employee found with email:', email);
      return {
        success: false,
        error: 'Employee not found'
      };
    }

    return {
      success: true,
      data: employeeData as Employee
    };
  } catch (error) {
    console.error('Getting employee by user ID failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createEmployeeForCurrentUser(organizationId: string): Promise<EmployeeResult> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user found');

    console.log('Debug - Current user:', { 
      id: user.id,
      email: user.email,
      metadata: user.user_metadata 
    });

    // Get organization member record
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('id, role, organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    console.log('Debug - Member data:', { memberData, memberError });

    if (memberError) throw memberError;
    if (!memberData) throw new Error('No organization member record found');

    // Check if employee already exists with this email in this organization
    const { data: existingEmployee, error: existingError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .eq('organization_id', organizationId)
      .maybeSingle();

    console.log('Debug - Existing employee:', { existingEmployee, existingError });

    if (existingEmployee) {
      // If employee exists but not linked to member, update it using RPC
      if (existingEmployee.member_id !== memberData.id) {
        console.log('Employee exists but not linked to member, updating member_id');
        const { data: updatedEmployee, error: updateError } = await supabase
          .rpc('update_employee_basic_info', {
            employee_id: existingEmployee.id,
            new_first_name: existingEmployee.first_name,
            new_last_name: existingEmployee.last_name,
            new_email: existingEmployee.email,
            new_phone: existingEmployee.phone,
            new_department: existingEmployee.department,
            new_start_date: existingEmployee.start_date,
            new_role: existingEmployee.role,
            new_status: existingEmployee.status,
            new_pto: existingEmployee.pto
          });

        console.log('Debug - Updated employee:', { updatedEmployee, updateError });

        if (updateError) throw updateError;
        return {
          success: true,
          data: updatedEmployee[0] as Employee
        };
      }

      // If employee exists and is linked, just return it
      console.log('Employee exists and is linked, returning existing record');
      return {
        success: true,
        data: existingEmployee as Employee
      };
    }

    // Create new employee record
    console.log('No existing employee found, creating new record');
    const employeeData = {
      organization_id: organizationId,
      member_id: memberData.id,
      first_name: '',  // Will be set through user settings
      last_name: '',   // Will be set through user settings
      email: user.email || '',
      role: memberData.role,
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

    console.log('Debug - Creating employee:', employeeData);

    const { data: newEmployee, error: createError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    console.log('Debug - Created employee:', { newEmployee, createError });

    if (createError) throw createError;
    return {
      success: true,
      data: newEmployee as Employee
    };
  } catch (error) {
    console.error('Failed to create employee for current user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
