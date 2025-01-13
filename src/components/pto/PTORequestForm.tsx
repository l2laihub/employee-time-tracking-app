import React, { useState, useEffect } from 'react';
import { format, isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { mockUsers } from '../../lib/mockUsers';
import { PTORequest, PTOType, TimesheetEntry } from '../../lib/types';
import { calculateVacationBalance, calculateSickLeaveBalance } from '../../utils/ptoCalculations';

interface PTORequestFormProps {
  onSubmit: (data: {
    startDate: string;
    endDate: string;
    type: PTOType;
    hours: number;
    reason: string;
  }) => void;
  onCancel: () => void;
  initialData?: PTORequest;
  isEdit?: boolean;
  pendingRequests: PTORequest[];
}

export default function PTORequestForm({ onSubmit, onCancel, initialData, isEdit, pendingRequests }: PTORequestFormProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [type, setType] = useState<PTOType>(initialData?.type || 'vacation');
  const [hours, setHours] = useState(initialData?.hours || 8);
  const [reason, setReason] = useState(initialData?.reason || '');
  const [error, setError] = useState<string | null>(null);

  const currentUser = user ? mockUsers.find(u => u.id === user.id) : null;

  const getPendingHours = (ptoType: PTOType) => {
    if (!user) return 0;
    return pendingRequests
      .filter(req => req.userId === user.id && req.type === ptoType && req.status === 'pending')
      .reduce((total, req) => total + req.hours, 0);
  };

  // Mock timesheets for now - in real app, this would come from a prop or context
  const mockTimesheets: TimesheetEntry[] = [];

  const getAvailableHours = (ptoType: PTOType) => {
    if (!currentUser) return 0;
    const totalBalance = ptoType === 'vacation'
      ? calculateVacationBalance(currentUser)
      : calculateSickLeaveBalance(mockTimesheets);
    const pendingHours = getPendingHours(ptoType);
    return totalBalance - pendingHours;
  };

  const calculateBusinessDays = (startDate: Date, endDate: Date) => {
    // Create new dates to avoid modifying the originals
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    let count = 0;
    const current = start;

    while (current <= end) {
      if (!isWeekend(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const calculateExpectedHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    // Parse dates in local timezone
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    // For same day, return 8 hours
    if (isSameDay(startDate, endDate)) {
      return 8;
    }

    const businessDays = calculateBusinessDays(startDate, endDate);
    return businessDays * 8;
  };

  const updateHours = (start: string, end: string) => {
    const expectedHours = calculateExpectedHours(start, end);
    setHours(expectedHours);
  };

  useEffect(() => {
    if (initialData) {
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setType(initialData.type);
      setHours(initialData.hours);
      setReason(initialData.reason);
    }
  }, [initialData]);

  useEffect(() => {
    if (startDate && endDate) {
      updateHours(startDate, endDate);
    }
  }, [startDate, endDate]);

  const validateRequest = () => {
    if (!currentUser) return false;
    
    const availableHours = getAvailableHours(type);

    if (hours > availableHours) {
      setError(`Insufficient ${type.replace('_', ' ')} balance. Available: ${availableHours} hours`);
      return false;
    }

    const expectedHours = calculateExpectedHours(startDate, endDate);
    if (hours !== expectedHours) {
      setError(`Hours must match the selected date range (${expectedHours} hours for ${expectedHours/8} business days)`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateRequest()) {
      onSubmit({ startDate, endDate, type, hours, reason });
    }
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
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          required
          value={type}
          onChange={(e) => setType(e.target.value as PTOType)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="vacation">Vacation</option>
          <option value="sick_leave">Sick Leave</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Hours</label>
        <input
          type="number"
          required
          min="1"
          max="40"
          value={hours}
          onChange={(e) => {
            const newHours = Number(e.target.value);
            setHours(newHours);
            
            // Validate hours against date range immediately
            const expectedHours = calculateExpectedHours(startDate, endDate);
            if (newHours !== expectedHours) {
              setError(`Hours must match the selected date range (${expectedHours} hours for ${expectedHours/8} business days)`);
            } else {
              setError(null);
            }
          }}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
            error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {error ? (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            {type === 'sick_leave' ? (
              <>
                Available: {getAvailableHours('sick_leave')} hours
                {getPendingHours('sick_leave') > 0 && (
                  <span className="text-yellow-600">
                    {' '}(includes {getPendingHours('sick_leave')} pending hours)
                  </span>
                )}
                {' '}(Accrues at 1 hour per 40 hours worked)
              </>
            ) : (
              <>
                Available: {getAvailableHours('vacation')} hours
                {getPendingHours('vacation') > 0 && (
                  <span className="text-yellow-600">
                    {' '}(includes {getPendingHours('vacation')} pending hours)
                  </span>
                )}
              </>
            )}
          </p>
        )}
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
