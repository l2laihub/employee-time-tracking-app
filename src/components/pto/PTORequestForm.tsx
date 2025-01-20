import React, { useState, useEffect } from 'react';
import { format, isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { mockTimesheets } from '../../lib/mockData';
import { PTORequest, PTOType, TimesheetEntry, Employee } from '../../lib/types';
import { usePTO } from '../../contexts/PTOContext';
import { useEmployees } from '../../contexts/EmployeeContext';

interface PTORequestFormProps {
  onSubmit: (data: {
    startDate: string;
    endDate: string;
    type: PTOType;
    hours: number;
    reason: string;
    userId: string;
    createdBy?: string;
  }) => void;
  onCancel: () => void;
  initialData?: PTORequest;
  isEdit?: boolean;
  onEmployeeSelect?: (employee: Employee | null) => void;
}

export default function PTORequestForm({ onSubmit, onCancel, initialData, isEdit, onEmployeeSelect }: PTORequestFormProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [type, setType] = useState<PTOType>(initialData?.type || 'vacation');
  const [hours, setHours] = useState(initialData?.hours || 8);
  const [reason, setReason] = useState(initialData?.reason || '');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  // For admin users, always use the selected employee if available
  // For admin users, use selected employee or current user
  const { employees } = useEmployees();
  const currentUser = isAdmin 
    ? selectedEmployee
    : (user ? employees.find(u => u.id === user.id) : null);

  const { getPTOBalance, addPTORequest, pendingRequests } = usePTO();

  // Set initial selected employee if editing or if admin is creating for themselves
  useEffect(() => {
    if (isAdmin) {
      if (initialData) {
        // For editing, use the request's user
        const employee = employees.find((u: Employee) => u.id === initialData.userId);
        setSelectedEmployee(employee || null);
      } else {
        // For new requests, pre-select the admin user
        const adminUser = employees.find((u: Employee) => u.id === user?.id);
        setSelectedEmployee(adminUser || null);
      }
    }
  }, [initialData, isAdmin, user?.id, employees]);

  const getTotalAllocation = (ptoType: PTOType) => {
    if (!currentUser || !currentUser.pto) return 0;
    return getPTOBalance(currentUser, ptoType);
  };

  const getUsedHours = (ptoType: PTOType) => {
    if (!currentUser) return 0;
    const used = pendingRequests
      .filter(req => 
        req.userId === currentUser.id && 
        req.type === ptoType && 
        (req.status === 'pending' || req.status === 'approved')
      )
      .reduce((total, req) => total + req.hours, 0);
    return used;
  };

  const getAvailableHours = (ptoType: PTOType) => {
    const total = getTotalAllocation(ptoType);
    const used = getUsedHours(ptoType);
    return total - used;
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
      if (!currentUser && isAdmin) {
        setError('Please select an employee first');
        return;
      }

      const expectedHours = calculateExpectedHours(startDate, endDate);
      const availableHours = getAvailableHours(type);

      if (expectedHours > availableHours) {
        setError(
          `Selected date range requires ${expectedHours} hours, but only ${availableHours} hours available. ` +
          `(Total: ${getTotalAllocation(type)} - Used: ${getUsedHours(type)})`
        );
      } else {
        setHours(expectedHours);
        setError(null);
      }
    }
  }, [startDate, endDate, type, currentUser, isAdmin]);

  // Reset form when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      // Reset hours to match date range if dates are set
      if (startDate && endDate) {
        updateHours(startDate, endDate);
      }
      // Clear any existing errors
      setError(null);
    }
  }, [selectedEmployee, startDate, endDate]);

  // Update hours when type changes
  useEffect(() => {
    if (startDate && endDate) {
      updateHours(startDate, endDate);
    }
  }, [type]);

  const validateRequest = () => {
    if (!currentUser) {
      setError('Please select an employee');
      return false;
    }
    
    const totalAllocation = getTotalAllocation(type);
    const usedHours = getUsedHours(type);
    const availableHours = totalAllocation - usedHours;

    if (hours > availableHours) {
      setError(
        `Insufficient ${type.replace('_', ' ')} balance. ` +
        `Available: ${availableHours} hours ` +
        `(Total: ${totalAllocation} - Used: ${usedHours})`
      );
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
    if (!currentUser) {
      setError('Please select an employee');
      return;
    }
    
    if (validateRequest()) {
      // For admin users, ensure we use the selected employee's ID
      const requestData = {
        startDate,
        endDate,
        type,
        hours,
        reason,
        userId: currentUser.id, // currentUser is already set to selectedEmployee for admin users
        createdBy: isAdmin ? user?.id : undefined // Track if admin created the request
      };
      
      addPTORequest(requestData);
      onSubmit(requestData);
      
      if (isAdmin) {
        setError('Request created successfully. It will need to be reviewed and approved.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Employee</label>
          <select
            required
            value={selectedEmployee?.id || ''}
            onChange={(e) => {
              const employee = employees.find((u: Employee) => u.id === e.target.value);
              setSelectedEmployee(employee || null);
              onEmployeeSelect?.(employee || null);
              // Reset error when employee changes
              setError(null);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select Employee (Required)</option>
            {employees
              .filter(u => u.role === 'employee' || u.id === user?.id)
              .map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))
            }
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            required
            disabled={isAdmin && !currentUser}
            min={format(new Date(), 'yyyy-MM-dd')}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
              isAdmin && !currentUser 
                ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                : 'border-gray-300'
            }`}
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            required
            disabled={isAdmin && !currentUser}
            min={startDate || format(new Date(), 'yyyy-MM-dd')}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
              isAdmin && !currentUser 
                ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                : 'border-gray-300'
            }`}
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            required
            disabled={isAdmin && !currentUser}
            value={type}
            onChange={(e) => setType(e.target.value as PTOType)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
              isAdmin && !currentUser 
                ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                : 'border-gray-300'
            }`}
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
          disabled={isAdmin && !currentUser}
          min="1"
          max={currentUser ? getTotalAllocation(type) - getUsedHours(type) : 0}
          value={hours}
          onChange={(e) => {
            const newHours = Number(e.target.value);
            setHours(newHours);
            
            // Validate hours against date range immediately
            const expectedHours = calculateExpectedHours(startDate, endDate);
            const availableHours = getAvailableHours(type);

            if (newHours > availableHours) {
              setError(
                `Insufficient ${type.replace('_', ' ')} balance. ` +
                `Available: ${availableHours} hours ` +
                `(Total: ${getTotalAllocation(type)} - Used: ${getUsedHours(type)})`
              );
            } else if (newHours !== expectedHours) {
              setError(`Hours must match the selected date range (${expectedHours} hours for ${expectedHours/8} business days)`);
            } else {
              setError(null);
            }
          }}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
            isAdmin && !currentUser 
              ? 'bg-gray-100 cursor-not-allowed border-gray-300'
              : error 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {error ? (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            <>
              Total Allocation: {getTotalAllocation(type)} hours
              <div className="text-sm mt-1">
                <span className="text-gray-600">Used: {getUsedHours(type)} hours</span>
                <br />
                <span className="text-green-600">Available: {getAvailableHours(type)} hours</span>
              </div>
              {type === 'sick_leave' && currentUser?.ptoAllocation?.sickLeave?.type === 'auto' && (
                <> (Accrues at 1 hour per 40 hours worked)</>
              )}
            </>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Reason</label>
        <textarea
          required
          disabled={isAdmin && !currentUser}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
            isAdmin && !currentUser 
              ? 'bg-gray-100 cursor-not-allowed border-gray-300'
              : 'border-gray-300'
          }`}
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
          {isEdit ? 'Save Changes' : isAdmin ? 'Create Pending Request' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
