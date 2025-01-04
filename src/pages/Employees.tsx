import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import EmployeeList from '../components/employees/EmployeeList';
import EmployeeForm from '../components/employees/EmployeeForm';
import ImportEmployeesModal from '../components/employees/ImportEmployeesModal';
import EmployeeFilters from '../components/employees/EmployeeFilters';
import { mockUsers } from '../lib/mockUsers';
import type { Employee } from '../lib/types';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(mockUsers);
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
    const newEmployee = {
      ...employeeData,
      id: `emp-${Date.now()}`
    };
    setEmployees([...employees, newEmployee]);
    setIsFormOpen(false);
  };

  const handleEditEmployee = (employeeData: Omit<Employee, 'id'>) => {
    if (!selectedEmployee) return;
    
    setEmployees(employees.map(emp => 
      emp.id === selectedEmployee.id 
        ? { ...employeeData, id: selectedEmployee.id }
        : emp
    ));
    setSelectedEmployee(null);
    setIsFormOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      setEmployees(employees.filter(emp => emp.id !== id));
    }
  };

  const handleImportEmployees = (importedEmployees: Omit<Employee, 'id'>[]) => {
    const newEmployees = importedEmployees.map((emp, index) => ({
      ...emp,
      id: `imported-${Date.now()}-${index}`,
      status: 'active'
    }));
    setEmployees([...employees, ...newEmployees]);
    setIsImportOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
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

      <div className="mt-6">
        <EmployeeList
          employees={filteredEmployees}
          onEdit={(emp) => {
            setSelectedEmployee(emp);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteEmployee}
        />
      </div>

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