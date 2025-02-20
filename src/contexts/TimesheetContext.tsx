import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Timesheet, TimeEntry, TimesheetStatus } from '../types/custom.types';
import * as timesheetService from '../services/timesheets';
import * as timeEntryService from '../services/timeEntries';
import * as employeeService from '../services/employees';
import { useOrganization } from './OrganizationContext';
import { useAuth } from './AuthContext';
import type { Employee } from '../lib/types';

interface TimesheetContextType {
  // State
  timesheets: Timesheet[];
  selectedTimesheet: Timesheet | null;
  timeEntries: TimeEntry[];
  isLoading: boolean;
  error: Error | null;
  userRole: string | undefined;

  // Timesheet actions
  refreshTimesheets: () => Promise<void>;
  createTimesheet: (employeeId: string, periodStartDate: Date, periodEndDate: Date) => Promise<void>;
  updateTimesheetStatus: (timesheetId: string, status: TimesheetStatus, reviewNotes?: string, totalHours?: number) => Promise<void>;
  selectTimesheet: (timesheet: Timesheet | null) => void;

  // Time entry actions
  createTimeEntry: (
    employeeId: string,
    jobLocationId: string,
    serviceType: 'hvac' | 'plumbing' | 'both',
    workDescription: string
  ) => Promise<void>;
  updateTimeEntry: (timeEntryId: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (timeEntryId: string) => Promise<void>;
}

const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

export function TimesheetProvider({ children }: { children: React.ReactNode }) {
  const { organization, userRole } = useOrganization();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshTimesheets = useCallback(async () => {
    if (!organization || !user) {
      setIsLoading(false);
      return;
    }

    // Wait for user role to be loaded
    if (userRole === undefined) {
      console.log('User role not loaded yet, skipping refresh');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Refreshing timesheets for organization:', organization.id);
      console.log('Current user:', user.id);
      console.log('User role:', userRole);
      setIsLoading(true);
      setError(null);

      // For admin/manager users, fetch all timesheets directly
      // For regular employees, fetch only their timesheets using employee ID
      let result;
      const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
      
      if (isAdminOrManager) {
        console.log('Admin/Manager user - fetching all timesheets');
        result = await timesheetService.listTimesheetsForOrganization(organization.id);
      } else {
        console.log('Regular employee - fetching their timesheets');
        // Get employee ID first
        const employeeResult = await employeeService.getEmployeeByUserId(user.id, organization.id);
        if (!employeeResult.success || !employeeResult.data) {
          throw new Error('Could not find employee record');
        }

        const employee = employeeResult.data as Employee;
        console.log('Found employee:', employee.id);
        
        // Get current date and set start date to 3 months ago
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        startDate.setUTCHours(0, 0, 0, 0);
        
        // Set end date to end of next month to include future timesheets
        const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        endDate.setUTCHours(23, 59, 59, 999);
        
        console.log('Fetching timesheets from:', startDate.toISOString(), 'to:', endDate.toISOString());
        console.log('Local dates - from:', startDate.toLocaleString(), 'to:', endDate.toLocaleString());
        
        result = await timesheetService.listTimesheetsForEmployee(
          employee.id,
          undefined, // no status filter
          startDate,
          endDate
        );
      }

      console.log('Timesheet refresh result:', result);
      
      if (result.success && result.data) {
        const timesheetData = Array.isArray(result.data) ? result.data : [result.data];
        console.log('Setting timesheets:', timesheetData);
        setTimesheets(timesheetData);
      } else {
        throw new Error(result.error || 'Failed to fetch timesheets');
      }
    } catch (err) {
      console.error('Error refreshing timesheets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch timesheets'));
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization, user, userRole]);

  const createTimesheet = useCallback(async (
    employeeId: string,
    periodStartDate: Date,
    periodEndDate: Date
  ) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      const result = await timesheetService.createTimesheet(
        employeeId,
        organization.id,
        periodStartDate,
        periodEndDate
      );

      if (result.success && result.data) {
        setTimesheets(prev => [...prev, result.data as Timesheet]);
      } else {
        throw new Error(result.error || 'Failed to create timesheet');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create timesheet');
    }
  }, [organization]);

  const updateTimesheetStatus = useCallback(async (
    timesheetId: string,
    status: TimesheetStatus,
    reviewNotes?: string,
    totalHours?: number
  ) => {
    try {
      console.log('TimesheetContext: Updating timesheet status', { timesheetId, status, reviewNotes, totalHours });
      const result = await timesheetService.updateTimesheetStatus(timesheetId, status, reviewNotes, totalHours);
      
      if (!result.success || !result.data) {
        console.error('TimesheetContext: Failed to update timesheet:', result.error);
        throw new Error(result.error || 'Failed to update timesheet status');
      }
      
      console.log('TimesheetContext: Update successful, updating state with data:', result.data);
      
      // Use the total hours from the server response
      setTimesheets(prev => prev.map(ts => 
        ts.id === timesheetId ? result.data as Timesheet : ts
      ));
      
      if (selectedTimesheet?.id === timesheetId) {
        setSelectedTimesheet(result.data as Timesheet);
      }
    } catch (err) {
      console.error('TimesheetContext: Error in updateTimesheetStatus:', err);
      throw err instanceof Error ? err : new Error('Failed to update timesheet status');
    }
  }, [selectedTimesheet]);

  const selectTimesheet = useCallback(async (timesheet: Timesheet | null) => {
    setSelectedTimesheet(timesheet);
    if (timesheet) {
      try {
        setIsLoading(true);
        const result = await timeEntryService.listTimeEntriesByTimesheet(timesheet.id);
        if (result.success && result.data) {
          setTimeEntries(Array.isArray(result.data) ? result.data : [result.data]);
        } else {
          throw new Error(result.error || 'Failed to fetch time entries');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch time entries'));
        setTimeEntries([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setTimeEntries([]);
    }
  }, []);

  const createTimeEntry = useCallback(async (
    employeeId: string,
    jobLocationId: string,
    serviceType: 'hvac' | 'plumbing' | 'both',
    workDescription: string
  ) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      const result = await timeEntryService.createTimeEntry({
        user_id: employeeId,
        organization_id: organization.id,
        job_location_id: jobLocationId,
        service_type: serviceType,
        work_description: workDescription
      });

      if (result.success && result.data) {
        setTimeEntries(prev => [...prev, result.data as TimeEntry]);
      } else {
        throw new Error(result.error || 'Failed to create time entry');
      }
    } catch (err) {
      console.error('Failed to create time entry:', err);
      throw err;
    }
  }, [organization]);

  const updateTimeEntry = useCallback(async (
    timeEntryId: string,
    updates: Partial<TimeEntry>
  ) => {
    try {
      const result = await timeEntryService.updateTimeEntry(timeEntryId, updates);
      if (result.success && result.data) {
        setTimeEntries(prev => prev.map(entry => 
          entry.id === timeEntryId ? result.data as TimeEntry : entry
        ));
      } else {
        throw new Error(result.error || 'Failed to update time entry');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update time entry');
    }
  }, []);

  const deleteTimeEntry = useCallback(async (timeEntryId: string) => {
    try {
      const result = await timeEntryService.deleteTimeEntry(timeEntryId);
      if (result.success) {
        setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
      } else {
        throw new Error(result.error || 'Failed to delete time entry');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete time entry');
    }
  }, []);

  useEffect(() => {
    refreshTimesheets();
  }, [refreshTimesheets]);

  return (
    <TimesheetContext.Provider value={{
      // State
      timesheets,
      selectedTimesheet,
      timeEntries,
      isLoading,
      error,
      userRole: userRole || undefined,

      // Timesheet actions
      refreshTimesheets,
      createTimesheet,
      updateTimesheetStatus,
      selectTimesheet,

      // Time entry actions
      createTimeEntry,
      updateTimeEntry,
      deleteTimeEntry
    }}>
      {children}
    </TimesheetContext.Provider>
  );
}

export function useTimesheets() {
  const context = useContext(TimesheetContext);
  if (context === undefined) {
    throw new Error('useTimesheets must be used within a TimesheetProvider');
  }
  return context;
}
