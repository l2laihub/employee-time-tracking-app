import React from 'react';
import { Employee, TimesheetEntry } from '../../lib/types';
import { Briefcase, Stethoscope } from 'lucide-react';
import { getVacationAllocationText } from '../../utils/ptoCalculations';
import { usePTO } from '../../contexts/PTOContext';

interface UserPTOBalanceProps {
  user: Employee;
}

export default function UserPTOBalance({ user }: UserPTOBalanceProps) {
  const { getPTOBalance } = usePTO();

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <Briefcase className="w-5 h-5 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-500">Vacation Balance</div>
            <div className="text-lg font-semibold">{getPTOBalance(user, 'vacation')} hours</div>
            <div className="text-xs text-gray-500">
              Allocation: {getVacationAllocationText(user)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Stethoscope className="w-5 h-5 text-green-500" />
          <div>
            <div className="text-sm font-medium text-gray-500">Sick Leave Balance</div>
            <div className="text-lg font-semibold">{getPTOBalance(user, 'sick_leave')} hours</div>
            <div className="text-xs text-gray-500">
              Accrues: 1 hour per 40 hours worked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
