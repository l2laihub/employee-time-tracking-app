import { useState, useCallback } from 'react';
import { FilterOptions } from '../types';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { WeeklyEmployeeHours, employeeDetailedHours } from '../mockReportData';

const initialFilters: FilterOptions = {
  search: '',
  location: '',
  status: '',
  startDate: startOfDay(new Date()),
  endDate: endOfDay(new Date())
};

export function useReportFilters(initialData: WeeklyEmployeeHours[]) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  
  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredData = useCallback(() => {
    return initialData.filter(item => {
      // Search filter
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Location filter
      if (filters.location) {
        const employeeEntries = employeeDetailedHours[item.id] || [];
        const hasLocationMatch = employeeEntries.some(
          entry => entry.jobLocation === filters.location
        );
        if (!hasLocationMatch) {
          return false;
        }
      }

      // Status filter
      if (filters.status) {
        switch (filters.status) {
          case 'active':
            if (item.totalRegular === 0) return false;
            break;
          case 'inactive':
            if (item.totalRegular > 0) return false;
            break;
          case 'pto':
            if (item.totalPTO === 0) return false;
            break;
        }
      }

      // Date range filter
      if (filters.startDate && filters.endDate) {
        const employeeEntries = employeeDetailedHours[item.id] || [];
        const hasEntriesInRange = employeeEntries.some(entry => {
          const entryDate = new Date(entry.date);
          return isWithinInterval(entryDate, {
            start: startOfDay(filters.startDate!),
            end: endOfDay(filters.endDate!)
          });
        });
        if (!hasEntriesInRange) {
          return false;
        }
      }

      return true;
    });
  }, [initialData, filters]);

  return {
    filters,
    updateFilter,
    filteredData: filteredData(),
    totalCount: initialData.length,
    filteredCount: filteredData().length
  };
}