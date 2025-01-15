import React, { useState } from 'react';
import { Edit2, Trash2, Mail, Phone, Calendar, Clock, Briefcase, Stethoscope, Settings } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import type { Employee } from '../../lib/types';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { getVacationAllocationText } from '../../utils/ptoCalculations';
import EmployeeStartDateForm from '../pto/EmployeeStartDateForm';
import { PTOAllocationForm } from '../pto/PTOAllocationForm';
import { usePTO } from '../../contexts/PTOContext';
import { useEmployees } from '../../contexts/EmployeeContext';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
}

export default function EmployeeTable({ employees, onEdit, onDelete, onUpdateStartDate }: EmployeeTableProps) {
  const { updateEmployee } = useEmployees();
  const { updatePTOAllocation, getPTOBalance } = usePTO();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingPTOEmployee, setEditingPTOEmployee] = useState<Employee | null>(null);

  const handleUpdatePTOAllocation = (employeeId: string, allocation: Employee['ptoAllocation']) => {
    updateEmployee(employeeId, { 
      ptoAllocation: {
        vacation: {
          type: allocation.vacation.type,
          hours: allocation.vacation.type === 'manual' ? allocation.vacation.hours : undefined
        },
        sickLeave: {
          type: allocation.sickLeave.type,
          hours: allocation.sickLeave.type === 'manual' ? allocation.sickLeave.hours : undefined
        }
      }
    });
    updatePTOAllocation(employeeId, allocation);
    setEditingPTOEmployee(null);
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Allocation Rules */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Employee Management</h2>
        <div className="mt-2 bg-blue-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">PTO Allocation Rules</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• First year employees: 1 week vacation</li>
            <li>• Second year: 1-2 weeks vacation</li>
            <li>• Third year onwards: 2-3 weeks vacation</li>
            <li>• Sick leave accrues at 1 hour per 40 hours worked</li>
          </ul>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PTO Balances
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                {/* Employee Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {employee.id}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact Info */}
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="w-4 h-4 mr-2" />
                      {employee.email}
                    </div>
                    {employee.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="w-4 h-4 mr-2" />
                        {employee.phone}
                      </div>
                    )}
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    employee.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : employee.role === 'manager'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {employee.role}
                  </span>
                </td>

                {/* Employment */}
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDateForDisplay(employee.startDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-2" />
                      {differenceInYears(new Date(), new Date(employee.startDate))} years
                    </div>
                  </div>
                </td>

                {/* PTO Balances */}
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-blue-500 mr-2" />
                      <div>
                        <div className="text-sm">Vacation</div>
                        <div className="font-medium">{getPTOBalance(employee, 'vacation')}h</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Stethoscope className="w-4 h-4 text-green-500 mr-2" />
                      <div>
                        <div className="text-sm">Sick Leave</div>
                        <div className="font-medium">{getPTOBalance(employee, 'sick_leave')}h</div>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingEmployee(employee)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit start date"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPTOEmployee(employee)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit PTO allocation"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(employee)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit employee"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(employee.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editingEmployee && (
        <EmployeeStartDateForm
          employee={editingEmployee}
          onSubmit={(employeeId, startDate) => {
            onUpdateStartDate(employeeId, startDate);
            setEditingEmployee(null);
          }}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {editingPTOEmployee && (
        <PTOAllocationForm
          employee={editingPTOEmployee}
          onSave={(allocation) => handleUpdatePTOAllocation(editingPTOEmployee.id, allocation)}
          onCancel={() => setEditingPTOEmployee(null)}
          isOpen={true}
        />
      )}
    </div>
  );
}
