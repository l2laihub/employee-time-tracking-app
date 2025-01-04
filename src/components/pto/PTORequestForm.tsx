import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PTORequest } from '../../lib/types';

interface PTORequestFormProps {
  onSubmit: (data: {
    startDate: string;
    endDate: string;
    reason: string;
  }) => void;
  onCancel: () => void;
  initialData?: PTORequest;
  isEdit?: boolean;
}

export default function PTORequestForm({ onSubmit, onCancel, initialData, isEdit }: PTORequestFormProps) {
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [reason, setReason] = useState(initialData?.reason || '');

  useEffect(() => {
    if (initialData) {
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setReason(initialData.reason);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ startDate, endDate, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          required
          min={format(new Date(), 'yyyy-MM-dd')}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">End Date</label>
        <input
          type="date"
          required
          min={startDate || format(new Date(), 'yyyy-MM-dd')}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Reason</label>
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Please provide a reason for your PTO request"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          {isEdit ? 'Save Changes' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}