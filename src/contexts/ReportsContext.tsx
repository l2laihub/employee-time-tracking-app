import React, { createContext, useContext, useState, useCallback } from 'react';
import { ReportsService, ReportFilters, WeeklyEmployeeHours, EmployeeTimeEntry } from '../services/reports';

interface ReportsContextType {
  isLoading: boolean;
  error: Error | null;
  weeklyHours: WeeklyEmployeeHours[];
  employeeDetails: Record<string, EmployeeTimeEntry[]>;
  filters: ReportFilters;
  updateFilters: (newFilters: Partial<ReportFilters>) => void;
  fetchWeeklyHours: () => Promise<void>;
  fetchEmployeeDetails: (employeeId: string) => Promise<void>;
  exportWeeklySummaryToCSV: () => Promise<string>;
  exportTimeEntriesToCSV: (employeeId: string) => Promise<string>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyEmployeeHours[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<Record<string, EmployeeTimeEntry[]>>({});
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(),
    endDate: new Date(),
  });

  const reportsService = new ReportsService();

  const updateFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const fetchWeeklyHours = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsService.getWeeklyHours(filters);
      
      let filteredData = [...data];

      // Filter by employee name if specified
      if (filters.employeeIds && filters.employeeIds.length > 0) {
        const searchTerms = filters.employeeIds.map(term => term.toLowerCase());
        filteredData = filteredData.filter(employee =>
          searchTerms.some(term => employee.name.toLowerCase().includes(term))
        );
      }

      // Filter by job location if specified
      if (filters.jobLocationIds && filters.jobLocationIds.length > 0) {
        filteredData = filteredData.filter(employee =>
          employee.jobLocationIds.some(id => filters.jobLocationIds?.includes(id))
        );
      }
      
      // Debug any employee with unexpected hours
      for (const employee of filteredData) {
        const total = employee.hours.monday + employee.hours.tuesday +
                     employee.hours.wednesday + employee.hours.thursday +
                     employee.hours.friday + employee.hours.saturday +
                     employee.hours.sunday;
        
        if (Math.abs(total - (employee.totalRegular + employee.totalOT)) > 0.01) {
          console.log(`Debugging hours for ${employee.name}:`, employee);
          const debugData = await reportsService.debugWeeklyHours(employee.id, filters);
          console.log('Debug data:', debugData);
        }
      }
      
      setWeeklyHours(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weekly hours'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchEmployeeDetails = useCallback(async (employeeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsService.getEmployeeDetails(employeeId, filters);
      setEmployeeDetails(prev => ({
        ...prev,
        [employeeId]: data
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employee details'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const exportWeeklySummaryToCSV = useCallback(async () => {
    try {
      return await reportsService.exportWeeklySummaryToCSV(filters);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export weekly summary'));
      throw err;
    }
  }, [filters]);

  const exportTimeEntriesToCSV = useCallback(async (employeeId: string) => {
    try {
      return await reportsService.exportTimeEntriesToCSV(employeeId, filters);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export time entries'));
      throw err;
    }
  }, [filters]);

  const value = {
    isLoading,
    error,
    weeklyHours,
    employeeDetails,
    filters,
    updateFilters,
    fetchWeeklyHours,
    fetchEmployeeDetails,
    exportWeeklySummaryToCSV,
    exportTimeEntriesToCSV
  };

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}