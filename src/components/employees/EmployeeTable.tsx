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
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {employees.map(employee => (
          <div key={employee.id} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {employee.first_name} {employee.last_name}
                </h3>
                <p className="text-sm text-gray-500">{employee.role}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                employee.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {employee.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="w-4 h-4 mr-2" />
                <span className="truncate">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center text-sm text-gray-500">
                  <Phone className="w-4 h-4 mr-2" />
                  {employee.phone}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <Briefcase className="w-4 h-4 mr-2" />
                {employee.department}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Started {formatDateForDisplay(employee.startDate)}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-2" />
                <span>Vacation: {getPTOBalance(employee, 'vacation')} hrs</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Stethoscope className="w-4 h-4 mr-2" />
                <span>Sick Leave: {getPTOBalance(employee, 'sick_leave')} hrs</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => onEdit(employee)}
                className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDelete(employee.id)}
                className="inline-flex items-center px-3 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

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
