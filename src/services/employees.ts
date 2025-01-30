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
    const { data: existingEmployees, error: existingError } = await supabase
      .from('employees')
      .select('email')
      .in('email', emails);

    if (existingError) {
      throw existingError;
    }

    if (existingEmployees && existingEmployees.length > 0) {
      const duplicateEmails = existingEmployees.map(emp => emp.email);
      throw new Error(`The following employees already exist: ${duplicateEmails.join(', ')}`);
    }

    // Add organization_id and member_id to each employee
    const employeesWithOrg = employees.map(employee => ({
      ...employee,
      organization_id: organizationId,
      member_id: member.id,
      status: employee.status || 'active',
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

    // Insert all employees
    const { data, error } = await supabase
      .from('employees')
      .insert(employeesWithOrg)
      .select();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        const match = error.message.match(/Key \(email\)=\((.*?)\)/);
        const email = match ? match[1] : 'unknown';
        throw new Error(`Employee with email ${email} already exists`);
      }
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      throw new Error('Failed to import employees');
    }

    return data.map((employee) => ({ 
      success: true, 
      data: employee as Employee 
    }));
  } catch (error) {
    console.error('Failed to import employees:', error);
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import employees'
    }];
  }
}
