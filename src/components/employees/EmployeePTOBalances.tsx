import React, { useState } from 'react';
import { differenceInYears } from 'date-fns';
import { Employee, TimesheetEntry } from '../../lib/types';
import { Briefcase, Stethoscope, Clock, Edit2, Settings } from 'lucide-react';
import EmployeeStartDateForm from '../pto/EmployeeStartDateForm';
import { PTOAllocationForm } from '../pto/PTOAllocationForm';
import { getVacationAllocationText } from '../../utils/ptoCalculations';
import { usePTO } from '../../contexts/PTOContext';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { mockTimesheets } from '../../lib/mockData';
import { mockUsers } from '../../lib/mockUsers';
import { useEmployees } from '../../contexts/EmployeeContext';

interface EmployeePTOBalancesProps {
  employees: Employee[];
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
}

export default function EmployeePTOBalances({ employees, onUpdateStartDate }: EmployeePTOBalancesProps) {
  const { updateEmployee } = useEmployees();
  const { getPTOBalance, updatePTOAllocation } = usePTO();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingPTOEmployee, setEditingPTOEmployee] = useState<Employee | null>(null);

  const handleUpdatePTOAllocation = (employeeId: string, allocation: Employee['ptoAllocation']) => {
    // Update both contexts to ensure consistency
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
    <div className="bg-white rounded-lg shadow mt-8">
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
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Allocation: {getVacationAllocationText(employee)}
                  </div>
                  <button
                    onClick={() => setEditingPTOEmployee(employee)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Edit PTO allocation"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">
                      Vacation Balance
                      {employee.ptoAllocation.vacation.type === 'manual' && (
                        <span className="ml-2 text-xs text-blue-600">(Manual)</span>
                      )}
                    </div>
                    <div className="text-lg">{getPTOBalance(employee, 'vacation')} hours</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">
                      Sick Leave Balance
                      {employee.ptoAllocation.sickLeave.type === 'manual' && (
                        <span className="ml-2 text-xs text-green-600">(Manual)</span>
                      )}
                    </div>
                    <div className="text-lg">{getPTOBalance(employee, 'sick_leave')} hours</div>
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

      <PTOAllocationForm
        employee={editingPTOEmployee || mockUsers[0]} // Provide a default to satisfy TS
        onSave={(allocation) => editingPTOEmployee && handleUpdatePTOAllocation(editingPTOEmployee.id, allocation)}
        onCancel={() => setEditingPTOEmployee(null)}
        isOpen={!!editingPTOEmployee}
      />
    </div>
  );
}
