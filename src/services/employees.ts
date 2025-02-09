import { supabase } from '../lib/supabase';
import type { Employee } from '../lib/types';

export interface EmployeeResult {
  success: boolean;
  data?: Employee | Employee[];
  error?: string;
}

export async function createEmployee(
  organizationId: string,
  employeeData: Omit<Employee, 'id'>
): Promise<EmployeeResult> {
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
        member_id: memberId
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
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Employee
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

    return {
      success: true,
      data: data as Employee[]
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

    return {
      success: true,
      data: data as Employee
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
    const { data, error } = await supabase
      .from('employees')
      .update({ pto: ptoUpdates })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Employee
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

    // Check for existing employees with the same email
    const emails = employees.map(emp => emp.email);
    console.log('Checking for existing employees with emails:', emails);
    
    const { data: existingEmployees, error: existingError } = await supabase
      .from('employees')
      .select('id, email, status')
      .in('email', emails)
      .eq('organization_id', organizationId);

    if (existingError) {
      console.error('Error checking existing employees:', existingError);
      throw existingError;
    }

    console.log('Found existing employees:', existingEmployees);

    // Separate active and inactive employees
    const activeEmails = existingEmployees
      ?.filter(emp => emp.status === 'active')
      .map(emp => emp.email) || [];
    
    const inactiveEmployees = existingEmployees
      ?.filter(emp => emp.status === 'inactive') || [];
    
    console.log('Active emails:', activeEmails);
    console.log('Inactive employees:', inactiveEmployees);

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
    console.log('Skipped employees (already active):', skippedEmails);

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

      const { data: updatedData, error: updateError } = await supabase
        .from('employees')
        .update({
          first_name: employee.first_name,
          last_name: employee.last_name,
          phone: employee.phone || null,
          role: employee.role,
          department: employee.department || null,
          start_date: employee.start_date,
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
        })
        .eq('id', existingEmployee.id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) {
        console.error('Error reactivating employee:', updateError);
        throw updateError;
      }
      
      if (updatedData) {
        console.log('Successfully reactivated employee:', updatedData);
        results.push({ success: true, data: updatedData as Employee });
      }
    }

    if (results.length === 0 && skippedEmails.length === 0) {
      throw new Error('No employees were imported or reactivated');
    }

    // If we have some successes but also some skipped, add a note about skipped
    if (skippedEmails.length > 0) {
      results.push({
        success: false,
        error: `The following employees were skipped (already active): ${skippedEmails.join(', ')}`
      });
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
    
    let query = supabase
      .from('employees')
      .select(`
        *,
        organization_members!inner (
          id,
          user_id,
          role,
          organization_id
        )
      `)
      .eq('organization_members.user_id', userId);
    
    // If organization ID is provided, filter by it
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Getting employee by user ID failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }

    // If organization ID was provided, return the single matching employee
    if (organizationId && data && data.length > 0) {
      console.log('Found employee for organization:', data[0]);
      return {
        success: true,
        data: data[0] as Employee
      };
    }
    
    // If no organization ID was provided, return all matching employees
    console.log('Found employees:', data);
    return {
      success: true,
      data: data as Employee[]
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

    // Check if employee already exists with this email
    const { data: existingEmployee, error: existingError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    console.log('Debug - Existing employee:', { existingEmployee, existingError });

    if (existingEmployee) {
      // If employee exists but in a different organization, create a new one
      if (existingEmployee.organization_id !== organizationId) {
        const employeeData = {
          organization_id: organizationId,
          member_id: memberData.id,
          first_name: user.user_metadata.first_name || '',
          last_name: user.user_metadata.last_name || '',
          email: user.email || '',
          role: memberData.role,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active'
        };

        console.log('Debug - Creating employee in new organization:', employeeData);

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
      }

      // If employee exists in this organization but not linked to member, update it
      if (existingEmployee.organization_id === organizationId && existingEmployee.member_id !== memberData.id) {
        const { data: updatedEmployee, error: updateError } = await supabase
          .from('employees')
          .update({ member_id: memberData.id })
          .eq('id', existingEmployee.id)
          .select()
          .single();

        console.log('Debug - Updated employee:', { updatedEmployee, updateError });

        if (updateError) throw updateError;
        return {
          success: true,
          data: updatedEmployee as Employee
        };
      }

      // If employee exists in this organization and is linked, just return it
      if (existingEmployee.organization_id === organizationId) {
        return {
          success: true,
          data: existingEmployee as Employee
        };
      }
    }

    // Create new employee record
    const employeeData = {
      organization_id: organizationId,
      member_id: memberData.id,
      first_name: user.user_metadata.first_name || '',
      last_name: user.user_metadata.last_name || '',
      email: user.email || '',
      role: memberData.role,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    console.log('Debug - Creating employee:', employeeData);

    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    console.log('Debug - Created employee:', { data, error });

    if (error) throw error;

    return {
      success: true,
      data: data as Employee
    };
  } catch (error) {
    console.error('Failed to create employee for current user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
