import React, { useState, useCallback } from 'react';
import { Plus, Upload } from 'lucide-react';
import EmployeeForm from '../components/employees/EmployeeForm';
import ImportEmployeesModal from '../components/employees/ImportEmployeesModal';
import EmployeeFilters from '../components/employees/EmployeeFilters';
import EmployeeTable from '../components/employees/EmployeeTable';
import type { Employee } from '../lib/types';
import { useEmployees } from '../contexts/EmployeeContext';
import { PTOProvider } from '../contexts/PTOContext';

export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    department: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      employee.email.toLowerCase().includes(filters.search.toLowerCase());

    const matchesRole = !filters.role || employee.role === filters.role;
    const matchesDepartment = !filters.department || employee.department === filters.department;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleAddEmployee = (employeeData: Omit<Employee, 'id'>) => {
    addEmployee(employeeData);
    setIsFormOpen(false);
  };

  const handleEditEmployee = (employeeData: Omit<Employee, 'id'>) => {
    if (!selectedEmployee) return;
    updateEmployee(selectedEmployee.id, employeeData);
    setSelectedEmployee(null);
    setIsFormOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee(id);
    }
  };

  const handleImportEmployees = (importedEmployees: Omit<Employee, 'id'>[]) => {
    // Generate unique timestamp for this batch
    const batchTimestamp = Date.now();
    
    console.log('Importing employees:', importedEmployees);
    
    const newEmployees = importedEmployees.map((emp, index) => {
      // Get PTO balances from imported data
      const vacationBalance = emp.pto?.vacation?.beginningBalance || 0;
      const sickLeaveBalance = emp.pto?.sickLeave?.beginningBalance || 0;
      
      console.log('PTO Balances:', { vacationBalance, sickLeaveBalance });
      
      const newEmployee = {
        ...emp,
        id: `emp-${batchTimestamp}-${index}`,
        status: 'active' as const,
        pto: {
          vacation: {
            beginningBalance: vacationBalance,
            ongoingBalance: 0,
            firstYearRule: 40
          },
          sickLeave: {  
            beginningBalance: sickLeaveBalance,
            used: 0
          }
        }
      };
      
      console.log('Created new employee:', newEmployee);
      return newEmployee;
    });
    
    // Add employees one by one to avoid React state batching issues
    newEmployees.forEach((emp, index) => {
      setTimeout(() => {
        console.log('Adding employee to state:', emp);
        addEmployee(emp);
        if (index === newEmployees.length - 1) {
          setIsImportOpen(false);
        }
      }, index * 100);
    });
  };

  const handleUpdateStartDate = useCallback((employeeId: string, startDate: string) => {
    updateEmployee(employeeId, { startDate });
  }, [updateEmployee]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Employees
          </button>
          <button
            onClick={() => {
              setSelectedEmployee(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      <EmployeeFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <PTOProvider>
        <EmployeeTable
          employees={filteredEmployees}
          onEdit={(emp) => {
            setSelectedEmployee(emp);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteEmployee}
          onUpdateStartDate={handleUpdateStartDate}
        />
      </PTOProvider>

      <EmployeeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={selectedEmployee ? handleEditEmployee : handleAddEmployee}
        initialData={selectedEmployee}
      />

      <ImportEmployeesModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportEmployees}
      />
    </div>
  );
}
