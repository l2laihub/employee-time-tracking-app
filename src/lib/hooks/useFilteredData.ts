import { useMemo } from 'react';
import { FilterOptions, FilteredData } from '../types';
import { WeeklyEmployeeHours } from '../mockReportData';

export function useFilteredData(
  data: WeeklyEmployeeHours[],
  filters: FilterOptions
): FilteredData {
  return useMemo(() => {
    let filtered = [...data];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(item => {
        // Add location filtering logic based on your data structure
        return true; // Placeholder
      });
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(item => {
        switch (filters.status) {
          case 'active':
            return item.totalRegular > 0;
          case 'inactive':
            return item.totalRegular === 0;
          case 'pto':
            return item.totalPTO > 0;
          default:
            return true;
        }
      });
    }

    return {
      weeklyHours: filtered,
      filteredCount: filtered.length,
      totalCount: data.length
    };
  }, [data, filters]);
}