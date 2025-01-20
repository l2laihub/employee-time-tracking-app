import React, { useState } from 'react';
import { Edit2, Trash2, Mail, Phone, Calendar, Clock, Briefcase, Stethoscope } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import type { Employee } from '../../lib/types';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { getVacationAllocationText } from '../../utils/ptoCalculations';
import EmployeeStartDateForm from '../pto/EmployeeStartDateForm';
import { usePTO } from '../../contexts/PTOContext';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
}

export default function EmployeeTable({ employees, onEdit, onDelete, onUpdateStartDate }: EmployeeTableProps) {
  const { getPTOBalance } = usePTO();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PTO Balances
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {employees.map(employee => (
            <tr key={employee.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {employee.first_name} {employee.last_name}
                </div>
                <div className="text-sm text-gray-500">
                  {employee.role}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col text-sm text-gray-500">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {employee.email}
                  </div>
                  {employee.phone && (
                    <div className="flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-1" />
                      {employee.phone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{employee.department}</div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Started {formatDateForDisplay(employee.startDate)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Briefcase className="w-4 h-4 text-blue-500 mr-1" />
                    <span>Vacation: {getPTOBalance(employee, 'vacation')} hrs</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Stethoscope className="w-4 h-4 text-green-500 mr-1" />
                    <span>Sick Leave: {getPTOBalance(employee, 'sick_leave')} hrs</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  employee.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {employee.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(employee)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(employee.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingEmployee && (
        <EmployeeStartDateForm
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSubmit={(startDate) => {
            onUpdateStartDate(editingEmployee.id, startDate);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}
