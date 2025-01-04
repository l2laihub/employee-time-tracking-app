import React from 'react';
import type { EmployeeDetailFilters as FilterType } from '../../../lib/hooks/useEmployeeDetailFilters';
import DateRangePicker from './DateRangePicker';
import LocationFilter from './LocationFilter';
import StatusFilter from './StatusFilter';

interface EmployeeDetailFilterProps {
  filters: FilterType;
  onFilterChange: <K extends keyof FilterType>(
    key: K,
    value: FilterType[K]
  ) => void;
}

export default function EmployeeDetailFilters({ 
  filters, 
  onFilterChange 
}: EmployeeDetailFilterProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <DateRangePicker
          startDate={filters.dateRange.startDate}
          endDate={filters.dateRange.endDate}
          onStartDateChange={(date) => 
            onFilterChange('dateRange', { ...filters.dateRange, startDate: date })
          }
          onEndDateChange={(date) => 
            onFilterChange('dateRange', { ...filters.dateRange, endDate: date })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <LocationFilter
          value={filters.location}
          onChange={(value) => onFilterChange('location', value)}
        />
        <StatusFilter
          value={filters.status}
          onChange={(value) => onFilterChange('status', value)}
        />
      </div>
    </div>
  );
}