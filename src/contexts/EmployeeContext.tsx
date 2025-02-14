import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Employee } from '../lib/types';
import * as employeeService from '../services/employees';
import { useOrganization } from './OrganizationContext';

interface EmployeeContextType {
  employees: Employee[];
  isLoading: boolean;
  error: Error | null;
  refreshEmployees: () => Promise<void>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  importEmployees: (employees: Omit<Employee, 'id'>[]) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { organization } = useOrganization();

  const refreshEmployees = useCallback(async () => {
    console.log('Refreshing employees...', {
      hasOrganization: !!organization,
      organizationId: organization?.id
    });

    if (!organization) {
      console.log('No organization, skipping employee refresh');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const result = await employeeService.listEmployees(organization.id);
      console.log('Employee list result:', {
        success: result.success,
        count: Array.isArray(result.data) ? result.data.length : 0,
        error: result.error
      });

      if (result.success && result.data) {
        const employeeList = Array.isArray(result.data) ? result.data : [result.data];
        console.log('Setting employees:', {
          count: employeeList.length,
          ids: employeeList.map(e => e.id)
        });
        setEmployees(employeeList);
      } else {
        throw new Error(result.error || 'Failed to fetch employees');
      }
    } catch (err) {
      console.error('Error refreshing employees:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
      setEmployees([]); // Clear employees on error
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  const createEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      const result = await employeeService.createEmployee(organization.id, employee);
      if (result.success && result.data) {
        setEmployees(prev => [...prev, result.data as Employee]);
      } else {
        throw new Error(result.error || 'Failed to create employee');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create employee');
    }
  }, [organization]);

  const updateEmployee = useCallback(async (id: string, employee: Partial<Employee>) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      const result = await employeeService.updateEmployee(id, employee);
      if (result.success && result.data) {
        setEmployees(prev => prev.map(emp => emp.id === id ? result.data as Employee : emp));
      } else {
        throw new Error(result.error || 'Failed to update employee');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update employee');
    }
  }, [organization]);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      const result = await employeeService.updateEmployee(id, { status: 'inactive' });
      if (result.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete employee');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete employee');
    }
  }, []);

  const importEmployees = useCallback(async (employees: Omit<Employee, 'id'>[]) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      const results = await employeeService.importEmployees(organization.id, employees);
      
      // Filter out non-error messages about skipped employees
      const failedResults = results.filter(result => 
        !result.success && !result.error?.startsWith('The following employees were skipped')
      );
      
      if (failedResults.length > 0) {
        throw new Error(failedResults[0].error || 'Failed to import employees');
      }

      // Get all successful imports (both new and reactivated)
      const successfulEmployees = results
        .filter((result): result is { success: true; data: Employee } => 
          result.success && !!result.data
        )
        .map(result => result.data);

      // Update state by merging new employees and updating existing ones
      setEmployees(prev => {
        const updatedEmployees = [...prev];
        
        successfulEmployees.forEach(newEmp => {
          const existingIndex = updatedEmployees.findIndex(emp => emp.id === newEmp.id);
          if (existingIndex >= 0) {
            // Update existing employee
            updatedEmployees[existingIndex] = newEmp;
          } else {
            // Add new employee
            updatedEmployees.push(newEmp);
          }
        });
        
        return updatedEmployees;
      });

      // Show skipped employees message if any
      const skippedResult = results.find(result => 
        !result.success && result.error?.startsWith('The following employees were skipped')
      );
      if (skippedResult) {
        console.log(skippedResult.error);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to import employees');
    }
  }, [organization]);

  useEffect(() => {
    refreshEmployees();
  }, [refreshEmployees]);

  return (
    <EmployeeContext.Provider value={{
      employees,
      isLoading,
      error,
      refreshEmployees,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      importEmployees
    }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployees() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
}
