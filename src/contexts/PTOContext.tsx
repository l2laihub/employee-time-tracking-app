import React, { createContext, useContext, useState, useCallback } from 'react';
import { Employee, PTORequest, TimesheetEntry } from '../lib/types';
import { mockTimesheets } from '../lib/mockData';
import { mockPTORequests } from '../lib/mockPTOData';
import { getVacationBalance, getSickLeaveBalance } from '../utils/ptoCalculations';

interface PTOContextType {
  getPTOBalance: (employee: Employee, type: 'vacation' | 'sick_leave') => number;
  updatePTOAllocation: (employeeId: string, allocation: Employee['ptoAllocation']) => void;
  pendingRequests: PTORequest[];
  addPTORequest: (request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>) => void;
  updatePTORequest: (requestId: string, status: 'approved' | 'rejected', reviewedBy: string) => void;
}

const PTOContext = createContext<PTOContextType | undefined>(undefined);

// Initialize with mock data for development
const initialPendingRequests: PTORequest[] = mockPTORequests;

interface PTOState {
  pendingRequests: PTORequest[];
  allocations: Record<string, Employee['ptoAllocation']>;
}

export function PTOProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PTOState>({
    pendingRequests: initialPendingRequests,
    allocations: {}
  });

  const getPTOBalance = useCallback((employee: Employee, type: 'vacation' | 'sick_leave') => {
    // Check if there's an updated allocation in state
    const updatedAllocation = state.allocations[employee.id];
    let allocation;
    
    if (updatedAllocation) {
      // Use the updated allocation if available
      allocation = type === 'vacation'
        ? updatedAllocation.vacation.hours || 0
        : updatedAllocation.sickLeave.hours || 0;
    } else {
      // Fall back to calculated allocation
      allocation = type === 'vacation'
        ? getVacationBalance(employee)
        : getSickLeaveBalance(employee, mockTimesheets);
    }

    // Get all used hours (both pending and approved)
    const usedHours = state.pendingRequests
      .filter(req => 
        req.userId === employee.id && 
        req.type === type && 
        (req.status === 'pending' || req.status === 'approved')
      )
      .reduce((total, req) => total + req.hours, 0);

    // For the total allocation, return just the allocation amount
    if (type === 'vacation' && employee.ptoAllocation.vacation.type === 'manual') {
      return employee.ptoAllocation.vacation.hours || 0;
    } else if (type === 'sick_leave' && employee.ptoAllocation.sickLeave.type === 'manual') {
      return employee.ptoAllocation.sickLeave.hours || 0;
    }

    // For available balance, subtract used hours
    return Math.max(0, allocation - usedHours); // Ensure balance never goes negative
  }, [state]);

  const updatePTOAllocation = useCallback((
    employeeId: string,
    allocation: Employee['ptoAllocation']
  ) => {
    setState(prev => ({
      ...prev,
      allocations: {
        ...prev.allocations,
        [employeeId]: allocation
      }
    }));
    // This will be replaced with Supabase update
    console.log('Updating PTO allocation:', { employeeId, allocation });
  }, []);

  const addPTORequest = useCallback((
    request: Omit<PTORequest, 'id' | 'status' | 'createdAt'> & { createdBy?: string }
  ) => {
    const { createdBy, ...requestData } = request;
    const newRequest: PTORequest = {
      ...requestData,
      id: `req-${Date.now()}`,
      status: 'pending', // Always set to pending for new requests
      createdAt: new Date().toISOString(),
      createdBy: createdBy // Store who created the request (if provided)
    };
    setState(prev => ({
      ...prev,
      pendingRequests: [...prev.pendingRequests, newRequest]
    }));
  }, []);

  const updatePTORequest = useCallback((
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string
  ) => {
    setState(prev => ({
      ...prev,
      pendingRequests: prev.pendingRequests.map(req =>
        req.id === requestId
          ? {
              ...req,
              status,
              reviewedBy,
              reviewedAt: new Date().toISOString()
            }
          : req
      )
    }));
  }, []);

  return (
    <PTOContext.Provider
      value={{
        getPTOBalance,
        updatePTOAllocation,
        pendingRequests: state.pendingRequests,
        addPTORequest,
        updatePTORequest
      }}
    >
      {children}
    </PTOContext.Provider>
  );
}

export function usePTO() {
  const context = useContext(PTOContext);
  if (context === undefined) {
    throw new Error('usePTO must be used within a PTOProvider');
  }
  return context;
}
