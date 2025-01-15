import React, { useState, ChangeEvent, FormEvent } from 'react';
import { usePTO } from '../../contexts/PTOContext';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PTOAllocationRulesForm({ isOpen, onClose }: Props) {
  const { rules, updateRules, loadingRules } = usePTO();
  const [formValues, setFormValues] = useState({
    firstYearVacationDays: rules.firstYearVacationDays,
    secondYearVacationDaysMin: rules.secondYearVacationDays.min,
    secondYearVacationDaysMax: rules.secondYearVacationDays.max,
    thirdYearPlusVacationDaysMin: rules.thirdYearPlusVacationDays.min,
    thirdYearPlusVacationDaysMax: rules.thirdYearPlusVacationDays.max,
    sickLeaveAccrualHours: rules.sickLeaveAccrualHours
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRules = {
      firstYearVacationDays: formValues.firstYearVacationDays,
      secondYearVacationDays: {
        min: formValues.secondYearVacationDaysMin,
        max: formValues.secondYearVacationDaysMax
      },
      thirdYearPlusVacationDays: {
        min: formValues.thirdYearPlusVacationDaysMin,
        max: formValues.thirdYearPlusVacationDaysMax
      },
      sickLeaveAccrualHours: formValues.sickLeaveAccrualHours
    };

    await updateRules(newRules);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit PTO Allocation Rules">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Year Vacation Days"
            type="number"
            value={formValues.firstYearVacationDays}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
              ...prev,
              firstYearVacationDays: parseInt(e.target.value)
            }))}
            min={0}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Second Year Vacation Days
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={formValues.secondYearVacationDaysMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
                  ...prev,
                  secondYearVacationDaysMin: parseInt(e.target.value)
                }))}
                min={0}
                required
              />
              <Input
                type="number"
                value={formValues.secondYearVacationDaysMax}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
                  ...prev,
                  secondYearVacationDaysMax: parseInt(e.target.value)
                }))}
                min={formValues.secondYearVacationDaysMin}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Third Year+ Vacation Days
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={formValues.thirdYearPlusVacationDaysMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
                  ...prev,
                  thirdYearPlusVacationDaysMin: parseInt(e.target.value)
                }))}
                min={0}
                required
              />
              <Input
                type="number"
                value={formValues.thirdYearPlusVacationDaysMax}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
                  ...prev,
                  thirdYearPlusVacationDaysMax: parseInt(e.target.value)
                }))}
                min={formValues.thirdYearPlusVacationDaysMin}
                required
              />
            </div>
          </div>

          <Input
            label="Sick Leave Accrual Hours"
            type="number"
            value={formValues.sickLeaveAccrualHours}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormValues(prev => ({
              ...prev,
              sickLeaveAccrualHours: parseInt(e.target.value)
            }))}
            min={1}
            required
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loadingRules}>
            {loadingRules ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
