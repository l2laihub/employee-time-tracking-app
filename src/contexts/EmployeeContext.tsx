import React, { createContext, useContext, useState } from 'react';
import { mockUsers as initialUsers } from '../lib/mockUsers';
import type { Employee } from '../lib/types';

interface EmployeeContextType {
  employees: Employee[];
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  deleteEmployee: (employeeId: string) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(initialUsers);

  const updateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId
          ? { ...emp, ...updates }
          : emp
      )
    );
  };

  const addEmployee = (employeeData: Omit<Employee, 'id'>) => {
    const newEmployee = {
      ...employeeData,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const deleteEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
  };

  return (
    <EmployeeContext.Provider value={{ employees, updateEmployee, addEmployee, deleteEmployee }}>
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
