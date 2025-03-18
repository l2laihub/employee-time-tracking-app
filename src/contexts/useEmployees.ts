import { useContext } from 'react';
import { EmployeeContext } from './EmployeeContext';

export function useEmployees() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
}
