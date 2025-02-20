import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Upload } from 'lucide-react';
import EmployeeForm from '../components/employees/EmployeeForm';
import ImportEmployeesModal from '../components/employees/ImportEmployeesModal';
import EmployeeFilters from '../components/employees/EmployeeFilters';
import EmployeeTable from '../components/employees/EmployeeTable';
import type { Employee, EmployeeFilters as EmployeeFiltersType, SortConfig } from '../lib/types';
import { useEmployees } from '../contexts/EmployeeContext';
import { PTOProvider } from '../contexts/PTOContext';

export default function Employees() {
  const { employees, createEmployee, updateEmployee, deleteEmployee, isLoading, error, refreshEmployees, importEmployees } = useEmployees();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filters, setFilters] = useState<EmployeeFiltersType>({
    search: '',
    role: '',
    department: '',
    status: 'active' // Default to showing only active employees
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'name',
    direction: 'asc'
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: SortConfig['column']) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortEmployees = (employees: Employee[]) => {
    return [...employees].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.column) {
        case 'name': {
          const nameA = `${a.last_name || ''} ${a.first_name || ''}`.trim();
          const nameB = `${b.last_name || ''} ${b.first_name || ''}`.trim();
          return nameA.localeCompare(nameB) * direction;
        }
        
        case 'department': {
          const deptA = a.department || '';
          const deptB = b.department || '';
          return deptA.localeCompare(deptB) * direction;
        }
        
        case 'role': {
          const roleA = a.role || '';
          const roleB = b.role || '';
          return roleA.localeCompare(roleB) * direction;
        }
        
        case 'start_date': {
          const dateA = a.start_date || '';
          const dateB = b.start_date || '';
          return dateA.localeCompare(dateB) * direction;
        }
        
        case 'status': {
          const statusA = a.status || '';
          const statusB = b.status || '';
          return statusA.localeCompare(statusB) * direction;
        }
        
        default:
          return 0;
      }
    });
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        employee.email.toLowerCase().includes(filters.search.toLowerCase());

      const matchesRole = !filters.role || employee.role === filters.role;
      const matchesDepartment = !filters.department || employee.department === filters.department;
      const matchesStatus = filters.status === 'all' || employee.status === filters.status;

      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }, [employees, filters]);

  const sortedEmployees = useMemo(() => {
    return sortEmployees(filteredEmployees);
  }, [filteredEmployees, sortConfig]);

  const employeeCounts = useMemo(() => {
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    return { active, inactive };
  }, [employees]);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      await createEmployee(employeeData);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to add employee:', err);
      alert('Failed to add employee. Please try again.');
    }
  };

  const handleEditEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    if (!selectedEmployee) return;
    try {
      await updateEmployee(selectedEmployee.id, employeeData);
      setSelectedEmployee(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert('Failed to update employee. Please try again.');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id);
      } catch (err) {
        console.error('Failed to delete employee:', err);
        alert('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleImportEmployees = async (importedEmployees: Omit<Employee, 'id'>[]) => {
    try {
      await importEmployees(importedEmployees);
      setIsImportOpen(false);
      await refreshEmployees(); // Refresh the list after import
    } catch (err) {
      console.error('Failed to import employees:', err);
      throw err; // Let the ImportEmployeesModal handle the error display
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        <h3 className="font-medium">Error loading employees</h3>
        <p>{error.toString()}</p>
        <button 
          onClick={refreshEmployees}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <PTOProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-600 mt-1">
              {employeeCounts.active} active, {employeeCounts.inactive} inactive
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Employees
            </button>
            <button
              onClick={() => {
                setSelectedEmployee(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </button>
          </div>
        </div>

        <EmployeeFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <EmployeeTable
            employees={sortedEmployees}
            onEdit={employee => {
              setSelectedEmployee(employee);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteEmployee}
            onUpdateStartDate={async (employeeId, startDate) => {
              try {
                await updateEmployee(employeeId, { start_date: startDate });
              } catch (err) {
                console.error('Failed to update start date:', err);
                alert('Failed to update start date. Please try again.');
              }
            }}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}

        {isFormOpen && (
          <EmployeeForm
            employee={selectedEmployee}
            onSubmit={selectedEmployee ? handleEditEmployee : handleAddEmployee}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedEmployee(null);
            }}
          />
        )}

        <ImportEmployeesModal
          isOpen={isImportOpen}
          onImport={handleImportEmployees}
          onClose={() => setIsImportOpen(false)}
        />
      </div>
    </PTOProvider>
  );
}
