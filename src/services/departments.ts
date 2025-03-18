import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Fetch all departments for the current user's organization
 * @returns Array of department names
 */
export async function getDepartments(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('name')
      .order('name');

    if (error) {
      throw error;
    }

    return data.map(dept => dept.name);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

/**
 * Fetch a department by its ID
 * @param id Department ID
 * @returns Department object or null if not found
 */
export async function getDepartmentById(id: string) {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching department:', error);
    return null;
  }
}

/**
 * Manage departments (add, update, delete)
 * @param action The action to perform: 'add', 'update', or 'delete'
 * @param departmentName The name of the department to add or the new name for update
 * @param oldDepartmentName The original name of the department (for update/delete)
 * @param organizationId The organization ID (required for adding departments)
 * @returns Boolean indicating success or failure
 */
export async function manageDepartments(
  action: 'add' | 'update' | 'delete',
  departmentName: string = '',
  oldDepartmentName: string = '',
  organizationId?: string
): Promise<boolean> {
  try {
    let result;

    switch (action) {
      case 'add':
        if (!organizationId) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData?.user) {
            throw new Error('User not authenticated');
          }
          
          // Get user's organization
          const { data: userOrg } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', userData.user.id)
            .single();
            
          if (!userOrg?.organization_id) {
            throw new Error('User has no organization');
          }
          
          organizationId = userOrg.organization_id;
        }
        
        result = await supabase
          .from('departments')
          .insert({ 
            name: departmentName,
            organization_id: organizationId
          });
        break;
      
      case 'update':
        result = await supabase
          .from('departments')
          .update({ name: departmentName })
          .eq('name', oldDepartmentName);
        break;
      
      case 'delete':
        result = await supabase
          .from('departments')
          .delete()
          .eq('name', departmentName);
        break;
      
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    if (result.error) {
      throw result.error;
    }

    // Show success message
    const actionText = action === 'add' ? 'added' : action === 'update' ? 'updated' : 'deleted';
    toast.success(`Department ${actionText} successfully`);
    
    return true;
  } catch (error) {
    console.error(`Error ${action}ing department:`, error);
    toast.error(`Failed to ${action} department`);
    return false;
  }
}

/**
 * Initialize default departments for a specific organization if none exist
 * @param organizationId The organization ID to initialize departments for
 */
export async function initializeDefaultDepartments(organizationId: string): Promise<void> {
  try {
    // Check if organization already has departments
    const { count, error } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }

    // If no departments exist for this organization, create defaults
    if (count === 0) {
      const defaultDepartments = [
        'Administration',
        'Management',
        'Office',
        'Field Work',
        'Human Resources',
        'Finance',
        'Customer Service'
      ];

      const departmentsToInsert = defaultDepartments.map(name => ({
        name,
        organization_id: organizationId
      }));

      const { error: insertError } = await supabase
        .from('departments')
        .insert(departmentsToInsert);

      if (insertError) {
        throw insertError;
      }

      console.log('Default departments initialized for organization:', organizationId);
    }
  } catch (error) {
    console.error('Error initializing default departments:', error);
  }
}
