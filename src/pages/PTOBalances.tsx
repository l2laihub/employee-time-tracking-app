import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEmployees } from '../contexts/EmployeeContext';
import EmployeePTOBalances from '../components/pto/EmployeePTOBalances';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PTOBalances() {
  const { user } = useAuth();
  const { employees, updateEmployee } = useEmployees();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleUpdateStartDate = (employeeId: string, startDate: string) => {
    // Ensure we're using the raw date value without any formatting
    updateEmployee(employeeId, { startDate: startDate });
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have permission to view this page.</p>
        <Link to="/pto" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Return to PTO Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee PTO Balances</h1>
          <p className="text-sm text-gray-600">View and manage team PTO balances</p>
        </div>
        <Link
          to="/pto"
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to PTO Requests
        </Link>
      </div>

      <EmployeePTOBalances 
        employees={employees.filter(u => u.role === 'employee')}
        onUpdateStartDate={handleUpdateStartDate}
      />
    </div>
  );
}
