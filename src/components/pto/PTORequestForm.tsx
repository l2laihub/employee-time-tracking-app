import React, { useState, useEffect, useMemo } from 'react';
import { format, isWeekend, isSameDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { PTORequest, PTOType, Employee } from '../../lib/types';
import { usePTO } from '../../contexts/PTOContext';
import { useEmployees } from '../../contexts/EmployeeContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { getEmployeeByUserId, createEmployeeForCurrentUser } from '../../services/employees';

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
  const [totalAllocation, setTotalAllocation] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);

  const { employees, refreshEmployees } = useEmployees();
  
  const currentEmployee = useMemo(() => {
    return user ? employees.find(emp => emp.email === user.email) : null;
  }, [user, employees]);
  
  const isAdmin = currentEmployee?.role === 'admin' || currentEmployee?.role === 'manager';
  const { organization, isLoading: orgLoading } = useOrganization();

  // For non-admin users, find and set their employee record on mount
  useEffect(() => {
    async function loadEmployeeRecord() {
      if (orgLoading || !user || !organization?.id || isLoadingEmployee) {
        return;
      }

      setIsLoadingEmployee(true);
      try {
        if (!isAdmin) {
          const result = await getEmployeeByUserId(user.id, organization.id);
          
          if (result.success && result.data) {
            const employeeData = Array.isArray(result.data) ? result.data[0] : result.data;
            if (employeeData) {
              setSelectedEmployee(employeeData);
              return;
            }
          }

          // If no employee record found, create one
          const createResult = await createEmployeeForCurrentUser(organization.id);
          
          if (createResult.success && createResult.data) {
            const newEmployee = Array.isArray(createResult.data)
              ? createResult.data[0]
              : createResult.data;
            await refreshEmployees();
            setSelectedEmployee(newEmployee);
          }
        } else {
          // For admin users, pre-select their own employee record
          const adminEmployee = employees.find(emp => emp.email === user.email);
          if (adminEmployee) {
            setSelectedEmployee(adminEmployee);
          }
        }
      } catch (error) {
        console.error('Error in loadEmployeeRecord:', error);
      } finally {
        setIsLoadingEmployee(false);
      }
    }
    loadEmployeeRecord();
  }, [isAdmin, user, organization?.id, orgLoading, refreshEmployees, employees]);

  // Use selectedEmployee directly as currentUser
  const currentUser = selectedEmployee;

  // Debug current user selection
  useEffect(() => {
    console.log('Current user selection:', {
      isAdmin,
      userId: user?.id,
      selectedEmployee: selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : null,
      currentUser: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : null,
      employeesCount: employees.length
    });
  }, [isAdmin, user?.id, selectedEmployee, currentUser, employees]);

  const { getPTOBalance, requests } = usePTO();

  // Load PTO balance when user or type changes
  useEffect(() => {
    async function loadBalance() {
      if (!currentUser) {
        console.log('No current user selected');
        setTotalAllocation(0);
        return;
      }

      setIsLoadingBalance(true);
      try {
        console.log('Loading PTO balance for:', {
          userId: currentUser.id,
          name: `${currentUser.first_name} ${currentUser.last_name}`,
          type: type
        });

        const balance = await getPTOBalance(currentUser, type);
        console.log('Loaded balance:', balance);
        setTotalAllocation(balance);
      } catch (err) {
        console.error('Failed to load PTO balance:', err);
        setTotalAllocation(0);
      } finally {
        setIsLoadingBalance(false);
      }
    }
    loadBalance();
  }, [currentUser, type, getPTOBalance]);

  // Set initial selected employee if editing or if admin is creating for themselves
  useEffect(() => {
    if (isAdmin) {
      if (initialData) {
        // For editing, use the request's user
        const employee = employees.find((u: Employee) => u.id === initialData.userId);
        setSelectedEmployee(employee || null);
      } else {
        // For new requests, pre-select the admin user by email
        const adminUser = employees.find((u: Employee) => u.email === user?.email);
        setSelectedEmployee(adminUser || null);
      }
    }
  }, [initialData, isAdmin, user?.id, employees]);

  const getUsedHours = (ptoType: PTOType) => {
    if (!currentUser) return 0;
    const used = requests
      .filter((req: PTORequest) =>
        req.userId === currentUser.id &&
        req.type === ptoType &&
        (req.status === 'pending' || req.status === 'approved')
      )
      .reduce((total: number, req: PTORequest) => total + req.hours, 0);
    return used;
  };

  const getAvailableHours = () => {
    const used = getUsedHours(type);
    return totalAllocation - used;
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
    return businessDays * Number(8);
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
      const availableHours = getAvailableHours();

      if (expectedHours > availableHours) {
        setError(
          `Selected date range requires ${expectedHours} hours, but only ${availableHours} hours available. ` +
          `(Total: ${totalAllocation} - Used: ${getUsedHours(type)})`
        );
      } else {
        setHours(expectedHours);
        setError(null);
      }
    }
  }, [startDate, endDate, type, currentUser, isAdmin, totalAllocation]);

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
      setError(`Hours must match the selected date range (${expectedHours} hours for ${Math.floor(expectedHours/8)} business days)`);
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
        userId: currentUser.id, // Use employee ID
        organization_id: currentUser.organization_id // Include organization ID
      };
      
      onSubmit(requestData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-4 sm:p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
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
            max={currentUser ? totalAllocation - getUsedHours(type) : 0}
            value={hours}
            onChange={(e) => {
              const newHours = Number(e.target.value);
              setHours(newHours);
              
              // Validate hours against date range immediately
              const expectedHours = calculateExpectedHours(startDate, endDate);
              const availableHours = getAvailableHours();

              if (newHours > availableHours) {
                setError(
                  `Insufficient ${type.replace('_', ' ')} balance. ` +
                  `Available: ${availableHours} hours ` +
                  `(Total: ${totalAllocation} - Used: ${getUsedHours(type)})`
                );
              } else if (newHours !== expectedHours) {
                setError(`Hours must match the selected date range (${expectedHours} hours for ${Math.floor(expectedHours/8)} business days)`);
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
            <div className="mt-1 text-sm text-gray-500">
              {isLoadingBalance ? (
                <div>Loading balance...</div>
              ) : (
                <>
                  <div>Total Allocation: {totalAllocation} hours</div>
                  <div className="mt-1">
                    <div className="text-gray-600">Used: {getUsedHours(type)} hours</div>
                    <div className="text-green-600">Available: {getAvailableHours()} hours</div>
                  </div>
                  {type === 'sick_leave' && currentUser?.pto?.vacation?.firstYearRule && (
                    <div className="mt-1">(Accrues at 1 hour per 40 hours worked)</div>
                  )}
                </>
              )}
            </div>
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
      </div>

      {/* Fixed bottom action buttons */}
      <div className="border-t p-4 sm:p-6 bg-white sticky bottom-0 rounded-b-lg">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isEdit ? 'Save Changes' : isAdmin ? 'Create Pending Request' : 'Submit Request'}
          </button>
        </div>
      </div>
    </form>
  );
}
