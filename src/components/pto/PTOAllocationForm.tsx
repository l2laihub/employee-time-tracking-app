import { useState, useEffect } from 'react';
import { Employee } from '../../lib/types';
import { getVacationBalance, getSickLeaveBalance } from '../../utils/ptoCalculations';
import { mockTimesheets } from '../../lib/mockData';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

type AllocationType = 'auto' | 'manual';

interface PTOAllocationFormProps {
  employee: Employee;
  onSave: (allocation: {
    vacation: { type: AllocationType; hours?: number };
    sickLeave: { type: AllocationType; hours?: number };
  }) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function PTOAllocationForm({ employee, onSave, onCancel, isOpen }: PTOAllocationFormProps) {
  const [vacation, setVacation] = useState({
    type: employee.ptoAllocation.vacation.type,
    hours: employee.ptoAllocation.vacation.hours || getVacationBalance(employee)
  });
  const [sickLeave, setSickLeave] = useState({
    type: employee.ptoAllocation.sickLeave.type,
    hours: employee.ptoAllocation.sickLeave.hours || getSickLeaveBalance(employee, mockTimesheets)
  });

  // Update state when employee changes
  useEffect(() => {
    setVacation({
      type: employee.ptoAllocation.vacation.type,
      hours: employee.ptoAllocation.vacation.hours || getVacationBalance(employee)
    });
    setSickLeave({
      type: employee.ptoAllocation.sickLeave.type,
      hours: employee.ptoAllocation.sickLeave.hours || getSickLeaveBalance(employee, mockTimesheets)
    });
  }, [employee]);

  const handleSave = () => {
    onSave({
      vacation: {
        type: vacation.type,
        hours: vacation.type === 'manual' ? vacation.hours : undefined
      },
      sickLeave: {
        type: sickLeave.type,
        hours: sickLeave.type === 'manual' ? sickLeave.hours : undefined
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Edit PTO Allocation - ${employee.first_name} ${employee.last_name}`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Vacation Allocation</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={vacation.type === 'auto'}
                onChange={() => setVacation(prev => ({ ...prev, type: 'auto' }))}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">Automatic</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={vacation.type === 'manual'}
                onChange={() => setVacation(prev => ({ ...prev, type: 'manual' }))}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">Manual</span>
            </label>
          </div>
          
          <div className="mt-2">
            {vacation.type === 'auto' ? (
              <div className="text-sm text-gray-600">
                Current automatic allocation: {getVacationBalance(employee)} hours
              </div>
            ) : (
            <div className="mt-2">
              <Input
                type="number"
                label="Vacation Hours"
                value={vacation.hours || ''}
                onChange={(value: string) => setVacation(prev => ({ ...prev, hours: Number(value) }))}
              />
            </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Sick Leave Allocation</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={sickLeave.type === 'auto'}
                onChange={() => setSickLeave(prev => ({ ...prev, type: 'auto' }))}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">Automatic</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={sickLeave.type === 'manual'}
                onChange={() => setSickLeave(prev => ({ ...prev, type: 'manual' }))}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">Manual</span>
            </label>
          </div>
          
          <div className="mt-2">
            {sickLeave.type === 'auto' ? (
              <div className="text-sm text-gray-600">
                Current automatic allocation: {getSickLeaveBalance(employee, mockTimesheets)} hours
              </div>
            ) : (
            <div className="mt-2">
              <Input
                type="number"
                label="Sick Leave Hours"
                value={sickLeave.hours || ''}
                onChange={(value: string) => setSickLeave(prev => ({ ...prev, hours: Number(value) }))}
              />
            </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave}>Save Changes</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
