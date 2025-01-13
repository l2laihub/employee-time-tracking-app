import React, { useState } from 'react';
import { differenceInYears } from 'date-fns';
import { Employee, TimesheetEntry } from '../../lib/types';
import { Briefcase, Stethoscope, Clock, Edit2 } from 'lucide-react';
import EmployeeStartDateForm from './EmployeeStartDateForm';
import { calculateVacationBalance, calculateSickLeaveBalance, getVacationAllocationText } from '../../utils/ptoCalculations';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface EmployeePTOBalancesProps {
  employees: Employee[];
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
}

export default function EmployeePTOBalances({ employees, onUpdateStartDate }: EmployeePTOBalancesProps) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  // Mock timesheets for now - in real app, this would come from a prop or context
  const mockTimesheets: TimesheetEntry[] = [];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Employee PTO Balances</h2>
      </div>
      <div className="p-4">
        <div className="mb-4 bg-blue-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Allocation Rules</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• First year employees: 1 week vacation</li>
            <li>• Second year: 1-2 weeks vacation</li>
            <li>• Third year onwards: 2-3 weeks vacation</li>
            <li>• Sick leave accrues at 1 hour per 40 hours worked</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          {employees.map(employee => (
            <div key={employee.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">
                      Started {formatDateForDisplay(employee.startDate)}
                    </p>
                    <button
                      onClick={() => setEditingEmployee(employee)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit start date"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Allocation: {getVacationAllocationText(employee)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Vacation Balance</div>
                    <div className="text-lg">{calculateVacationBalance(employee)} hours</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Sick Leave Balance</div>
                    <div className="text-lg">{calculateSickLeaveBalance(mockTimesheets)} hours</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  {differenceInYears(new Date(), new Date(employee.startDate))} years of service
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
