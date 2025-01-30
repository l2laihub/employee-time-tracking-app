import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useEmployees } from '../../contexts/EmployeeContext';
import EmployeeTable from './EmployeeTable';
import EmployeeForm from './EmployeeForm';
import ImportEmployeesButton from './ImportEmployeesButton';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

export default function EmployeesPage() {
  const { employees, isLoading, error } = useEmployees();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Employees</h1>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading employees</h3>
          <p className="text-red-600 mt-1">{error.message}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-100 text-red-800 hover:bg-red-200"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <div className="flex gap-4">
          <ImportEmployeesButton />
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No employees yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first employee</p>
          <div className="mt-6">
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>
        </div>
      ) : (
        <EmployeeTable employees={employees} />
      )}

      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
      >
        <EmployeeForm onClose={() => setIsAddModalOpen(false)} />
      </Dialog>
    </div>
  );
}
