import React, { useState } from 'react';
import { Employee } from '../../lib/types';
import { Calendar, X } from 'lucide-react';
import { getTodayForInput } from '../../utils/dateUtils';

interface EmployeeStartDateFormProps {
  employee: Employee;
  onSubmit: (employeeId: string, startDate: string) => void;
  onClose: () => void;
}

export default function EmployeeStartDateForm({ employee, onSubmit, onClose }: EmployeeStartDateFormProps) {
  // Initialize with raw date value
  const [startDate, setStartDate] = useState(employee.startDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass the raw date value
    onSubmit(employee.id, startDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Edit Employment Start Date</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Employee: {employee.first_name} {employee.last_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                required
                max={getTodayForInput()}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              This will affect the employee's PTO calculations
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
