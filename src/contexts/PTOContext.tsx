import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Employee, PTORequest, PTOType } from '../lib/types';
import { PTORequestResult } from '../services/pto';
import { Timesheet } from '../types/custom.types';
import { getVacationBalance, getSickLeaveBalance } from '../utils/ptoCalculations';
import { listTimesheetsForEmployee } from '../services/timesheets';
import { listPTORequests, createPTORequest, updatePTORequestStatus, deletePTORequest } from '../services/pto';
import { useOrganization } from './OrganizationContext';

interface PTOContextType {
  getPTOBalance: (employee: Employee, type: PTOType) => Promise<number>;
  requests: PTORequest[];  // Changed from pendingRequests to requests
  addPTORequest: (request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>) => Promise<PTORequestResult>;
  updatePTORequest: (requestId: string, status: 'approved' | 'rejected', reviewedBy: string) => Promise<void>;
  deletePTORequest: (requestId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const PTOContext = createContext<PTOContextType | undefined>(undefined);

interface PTOState {
  requests: PTORequest[];
  loading: boolean;
  error: string | null;
}

// Default PTO structure matching Employee type
const DEFAULT_PTO_STRUCTURE = {
  vacation: {
    beginningBalance: 0,
    ongoingBalance: 0,
    firstYearRule: 40, // 40 hours (5 days) for first year
    used: 0
  },
  sickLeave: {
    beginningBalance: 0,
    used: 0
  }
};

// Convert Timesheet to format needed for balance calculation
function convertTimesheet(timesheet: Timesheet) {
  return {
    id: timesheet.id,
    userId: timesheet.employee_id,
    employeeName: timesheet.employee ? 
      `${timesheet.employee.first_name} ${timesheet.employee.last_name}` : 
      'Unknown',
    weekStartDate: timesheet.period_start_date,
    weekEndDate: timesheet.period_end_date,
    status: timesheet.status,
    notes: timesheet.review_notes || '',
    timeEntries: [],
    totalHours: timesheet.total_hours,
    submittedAt: timesheet.submitted_at,
    reviewedBy: timesheet.reviewed_by || null,
    reviewedAt: timesheet.reviewed_at || null
  };
}

export function PTOProvider({ children }: { children: React.ReactNode }) {
  console.log('PTOProvider initializing');
  const { organization, isLoading: orgLoading, error: orgError } = useOrganization();
  const [state, setState] = useState<PTOState>({
    requests: [],
    loading: true,
    error: null
  });

  // Debug organization context
  useEffect(() => {
    console.log('Organization context changed:', {
      hasOrg: !!organization,
      orgId: organization?.id,
      loading: orgLoading,
      error: orgError?.message,
      stateLoading: state.loading,
      stateError: state.error,
      requestsCount: state.requests.length
    });
  }, [organization?.id, orgLoading, orgError, state]);

  // Load initial PTO requests
  useEffect(() => {
    console.log('PTO requests load effect triggered:', {
      hasOrg: !!organization,
      orgId: organization?.id,
      loading: state.loading,
      currentRequestsCount: state.requests.length
    });
    async function loadPTORequests() {
      console.log('PTO requests load effect triggered:', {
        organizationId: organization?.id,
        orgLoading,
        hasOrgError: !!orgError
      });

      if (orgLoading) {
        console.log('Organization still loading, waiting...');
        return;
      }

      if (!organization?.id) {
        console.log('No organization ID available, skipping PTO requests load');
        return;
      }

      if (orgError) {
        console.error('Organization error present:', orgError);
        return;
      }

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        console.log('Loading PTO requests for organization:', organization.id);
        const result = await listPTORequests(organization.id);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load PTO requests');
        }

        console.log('PTO requests response:', {
          success: result.success,
          dataType: result.data ? Array.isArray(result.data) ? 'array' : 'single' : 'none',
          count: result.data ? Array.isArray(result.data) ? result.data.length : 1 : 0
        });

        const requests = Array.isArray(result.data) ? result.data : [result.data];
        console.log('Processed PTO requests:', {
          total: requests.length,
          statuses: requests.reduce((acc, req) => {
            if (req) {
              acc[req.status] = (acc[req.status] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>)
        });

        const validRequests = requests.filter((req): req is PTORequest => req !== undefined);
        console.log('Valid PTO requests:', {
          total: validRequests.length,
          filtered: requests.length - validRequests.length
        });

        console.log('Updating PTO context state with requests:', {
          validRequestsCount: validRequests.length,
          currentStateCount: state.requests.length
        });
        
        setState(prev => ({
          ...prev,
          requests: validRequests,
          loading: false
        }));
      } catch (error) {
        console.error('Error loading PTO requests:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          loading: false
        }));
      }
    }

    loadPTORequests();
  }, [organization?.id, orgLoading]);

  // Debug log whenever state changes
  useEffect(() => {
    console.log('PTOContext state updated:', {
      requestsCount: state.requests.length,
      loading: state.loading,
      error: state.error,
      organizationId: organization?.id,
      orgLoading
    });
  }, [state, organization?.id, orgLoading]);

  const getPTOBalance = useCallback(async (employee: Employee, type: PTOType): Promise<number> => {
    try {
      console.log('Getting PTO balance for:', {
        employeeId: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        type,
        currentPTO: employee.pto
      });

      // Initialize default PTO structure if it doesn't exist
      const employeeWithPTO: Employee = {
        ...employee,
        pto: employee.pto || DEFAULT_PTO_STRUCTURE
      };

      console.log('Employee PTO structure:', employeeWithPTO.pto);

      // Get employee's approved timesheets for sick leave calculation
      const timesheetsResult = type === 'sick_leave' 
        ? await listTimesheetsForEmployee(employee.id, 'approved')
        : { success: true, data: [] };

      if (!timesheetsResult.success) {
        console.error('Failed to fetch timesheets:', timesheetsResult.error);
        return 0;
      }

      // Convert timesheets to format needed for balance calculation
      const timesheets = Array.isArray(timesheetsResult.data)
        ? timesheetsResult.data.map(convertTimesheet)
        : timesheetsResult.data ? [convertTimesheet(timesheetsResult.data)] : [];

      console.log('Timesheets for calculation:', timesheets.length);

      // Calculate base balance
      const baseBalance = type === 'vacation'
        ? getVacationBalance(employeeWithPTO)
        : getSickLeaveBalance(employeeWithPTO, timesheets);

      console.log('Base balance calculated:', baseBalance);

      // Get all used hours from pending requests
      const activeRequests = state.requests.filter(req =>
        req.userId === employee.id &&
        req.type === type &&
        (req.status === 'pending' || req.status === 'approved')
      );

      console.log('Active requests found:', activeRequests.length);

      const activeHours = activeRequests.reduce((total, req) => total + req.hours, 0);
      console.log('Active hours:', activeHours);

      // Calculate final balance
      const finalBalance = Math.max(0, baseBalance - activeHours);
      console.log('Final balance:', finalBalance);

      return finalBalance;
    } catch (error) {
      console.error('Error calculating PTO balance:', error);
      throw error; // Let the component handle the error
    }
  }, [state.requests]);

  const addPTORequest = useCallback(async (
    request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>
  ) => {
    if (!organization?.id) {
      throw new Error('Organization ID is required');
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await createPTORequest(request.userId, organization.id, request);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create PTO request');
      }

      // Refresh the PTO requests list
      console.log('Refreshing PTO requests after creation');
      const listResult = await listPTORequests(organization.id);
      if (!listResult.success) {
        throw new Error(listResult.error || 'Failed to refresh PTO requests');
      }

      const requests = Array.isArray(listResult.data) ? listResult.data : [listResult.data];
      setState(prev => ({
        ...prev,
        requests: requests.filter((req): req is PTORequest => req !== undefined),
        loading: false,
        error: null // Clear any previous errors
      }));

      return result; // Return the result so the component can show success message
    } catch (error) {
      console.error('Error creating PTO request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false
      }));
      throw error;
    }
  }, [organization?.id]);

  const updatePTORequest = useCallback(async (
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string
  ) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await updatePTORequestStatus(requestId, status, reviewedBy);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update PTO request');
      }

      setState(prev => ({
        ...prev,
        requests: prev.requests.filter(req => req.id !== requestId),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating PTO request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false
      }));
      throw error;
    }
  }, []);

  const handleDeletePTORequest = useCallback(async (requestId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await deletePTORequest(requestId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete PTO request');
      }

      setState(prev => ({
        ...prev,
        requests: prev.requests.filter(req => req.id !== requestId),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting PTO request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false
      }));
      throw error;
    }
  }, []);

  return (
    <PTOContext.Provider value={{
      getPTOBalance,
      requests: state.requests,
      addPTORequest,
      updatePTORequest,
      deletePTORequest: handleDeletePTORequest,
      loading: state.loading,
      error: state.error
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
