import { useState, useCallback } from 'react';
import { EmployeeTimeEntry } from '../mockReportData';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export interface EmployeeDetailFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  location: string;
  status: string;
}

export function useEmployeeDetailFilters(
  entries: EmployeeTimeEntry[], 
  initialDateRange: { startDate: Date; endDate: Date }
) {
  const [filters, setFilters] = useState<EmployeeDetailFilters>({
    dateRange: initialDateRange,
    location: '',
    status: ''
  });

  const updateFilter = useCallback(<K extends keyof EmployeeDetailFilters>(
    key: K,
    value: EmployeeDetailFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredEntries = useCallback(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);

      // Date range filter
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        const isInRange = isWithinInterval(entryDate, {
          start: startOfDay(filters.dateRange.startDate),
          end: endOfDay(filters.dateRange.endDate)
        });
        if (!isInRange) return false;
      }

      // Location filter
      if (filters.location && entry.jobLocation !== filters.location) {
        return false;
      }

      // Status filter
      if (filters.status && entry.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [entries, filters]);

  const filtered = filteredEntries();

  return {
    filters,
    updateFilter,
    filteredEntries: filtered,
    totalEntries: entries.length,
    filteredCount: filtered.length
  };
}