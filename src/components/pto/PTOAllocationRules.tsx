import React, { useState } from 'react';
import { usePTO } from '../../contexts/PTOContext';
import { Settings } from 'lucide-react';
import PTOAllocationRulesForm from './PTOAllocationRulesForm';

export default function PTOAllocationRules() {
  const { rules } = usePTO();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <div className="bg-blue-50 p-3 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-blue-900">PTO Allocation Rules</h3>
        <button
          className="text-blue-600 hover:text-blue-900"
          onClick={() => setIsFormOpen(true)}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• First year employees: {rules.firstYearVacationDays} days vacation</li>
        <li>• Second year: {rules.secondYearVacationDays.min}-{rules.secondYearVacationDays.max} days vacation</li>
        <li>• Third year onwards: {rules.thirdYearPlusVacationDays.min}-{rules.thirdYearPlusVacationDays.max} days vacation</li>
        <li>• Sick leave accrues at 1 hour per {rules.sickLeaveAccrualHours} hours worked</li>
      </ul>
      </div>
      
      <PTOAllocationRulesForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
}
