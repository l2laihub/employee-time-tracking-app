import React, { useState } from 'react';
import { differenceInYears } from 'date-fns';
import { Employee, TimesheetEntry } from '../../lib/types';
import { Briefcase, Stethoscope, Clock } from 'lucide-react';
import EmployeeStartDateForm from '../pto/EmployeeStartDateForm';
import { getVacationAllocationText, getVacationBalance, getSickLeaveBalance } from '../../utils/ptoCalculations';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface EmployeePTOBalancesProps {
  employees: Employee[];
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
}

export default function EmployeePTOBalances({ employees, onUpdateStartDate }: EmployeePTOBalancesProps) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  return (
    <div className="bg-white rounded-lg shadow mt-8">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Employee PTO Balances</h2>
      </div>
      <div className="p-4">
        <div className="mb-4 bg-blue-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Vacation Rules</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• First year: 5 days (40 hours)</li>
            <li>• Second year onwards: 10 days (80 hours)</li>
            <li>• Sick leave accrues at 1 hour per 40 hours worked</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          {employees.map(employee => {
            const vacationBalance = getVacationBalance(employee);
            const sickLeaveBalance = getSickLeaveBalance(employee, []); // TODO: Pass actual timesheets
            
            return (
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
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {getVacationAllocationText(employee)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Vacation Balance */}
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium">Vacation Balance</div>
                      <div className="text-lg">{vacationBalance} hours</div>
                      <div className="text-xs text-gray-500">
                        Beginning: {employee.pto.vacation.beginningBalance} hrs
                        {employee.pto.vacation.ongoingBalance > 0 && 
                          ` + Ongoing: ${employee.pto.vacation.ongoingBalance} hrs`}
                      </div>
                    </div>
                  </div>

                  {/* Sick Leave Balance */}
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium">Sick Leave Balance</div>
                      <div className="text-lg">{sickLeaveBalance} hours</div>
                      <div className="text-xs text-gray-500">
                        Beginning: {employee.pto.sickLeave.beginningBalance} hrs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
