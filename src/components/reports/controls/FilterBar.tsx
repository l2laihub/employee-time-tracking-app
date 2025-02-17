import React from 'react';
import TableFilter from './TableFilter';
import LocationFilter from './LocationFilter';
import { ReportFilters } from '../../../services/reports';

interface FilterBarProps {
  filters: ReportFilters;
  onFilterChange: (newFilters: Partial<ReportFilters>) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const handleEmployeeFilterChange = (employeeIds: string[]) => {
    onFilterChange({ employeeIds });
  };

  const handleLocationFilterChange = (jobLocationIds: string[]) => {
    onFilterChange({ jobLocationIds });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <TableFilter
        value={filters.employeeIds || []}
        onChange={handleEmployeeFilterChange}
        placeholder="Filter by employee..."
      />
      <LocationFilter
        value={filters.jobLocationIds || []}
        onChange={handleLocationFilterChange}
      />
    </div>
  );
}