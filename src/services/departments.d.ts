/**
 * Department interface
 */
export interface Department {
  id: string;
  name: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all departments from the database
 * @returns Array of department names
 */
export function getDepartments(): Promise<string[]>;

/**
 * Manage departments (add, update, delete)
 * @param action The action to perform: 'add', 'update', or 'delete'
 * @param departmentName The name of the department to add or the new name for update
 * @param oldDepartmentName The original name of the department (for update/delete)
 * @param organizationId The ID of the organization to which the department belongs
 * @returns Boolean indicating success or failure
 */
export function manageDepartments(
  action: 'add' | 'update' | 'delete',
  departmentName: string,
  oldDepartmentName?: string,
  organizationId?: string
): Promise<boolean>;

/**
 * Initialize default departments for an organization if none exist
 * @param organizationId The ID of the organization to initialize departments for
 */
export function initializeDefaultDepartments(organizationId: string): Promise<void>;

/**
 * Get a department by its ID
 * @param id The ID of the department to fetch
 * @returns The department object or null if not found
 */
export function getDepartmentById(id: string): Promise<Department | null>;
