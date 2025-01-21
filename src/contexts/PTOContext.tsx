import React, { createContext, useContext, useState, useCallback } from 'react';
import { Employee, PTORequest, TimesheetEntry } from '../lib/types';
import { mockTimesheets } from '../lib/mockData';
import { mockPTORequests } from '../lib/mockPTOData';
import { getVacationBalance, getSickLeaveBalance } from '../utils/ptoCalculations';

interface PTOContextType {
  getPTOBalance: (employee: Employee, type: 'vacation' | 'sick_leave') => number;
  pendingRequests: PTORequest[];
  addPTORequest: (request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>) => void;
  updatePTORequest: (requestId: string, status: 'approved' | 'rejected', reviewedBy: string) => void;
  deletePTORequest: (requestId: string) => void;
}

const PTOContext = createContext<PTOContextType | undefined>(undefined);

// Initialize with mock data for development
const initialPendingRequests: PTORequest[] = mockPTORequests;

interface PTOState {
  pendingRequests: PTORequest[];
}

export function PTOProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PTOState>({
    pendingRequests: initialPendingRequests,
  });

  const getPTOBalance = useCallback((employee: Employee, type: 'vacation' | 'sick_leave') => {
    if (!employee.pto) {
      return 0; // Return 0 if PTO structure doesn't exist
    }

    // Get the base balance based on type
    const baseBalance = type === 'vacation'
      ? getVacationBalance(employee)
      : getSickLeaveBalance(employee, mockTimesheets);

    // Get all used hours from pending requests
    const pendingHours = state.pendingRequests
      .filter(req => 
        req.userId === employee.id && 
        req.type === type && 
        req.status === 'pending'
      )
      .reduce((total, req) => total + req.hours, 0);

    // Return available balance minus pending hours
    return Math.max(0, baseBalance - pendingHours); // Ensure balance never goes negative
  }, [state.pendingRequests]);

  const addPTORequest = useCallback((request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>) => {
    const newRequest: PTORequest = {
      ...request,
      id: `req-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      pendingRequests: [...prev.pendingRequests, newRequest],
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
          ? { ...req, status, reviewedBy, reviewedAt: new Date().toISOString() }
          : req
      ),
    }));
  }, []);

  const deletePTORequest = useCallback((requestId: string) => {
    setState(prev => ({
      ...prev,
      pendingRequests: prev.pendingRequests.filter(req => req.id !== requestId),
    }));
  }, []);

  return (
    <PTOContext.Provider value={{
      getPTOBalance,
      pendingRequests: state.pendingRequests,
      addPTORequest,
      updatePTORequest,
      deletePTORequest,
    }}>
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
