import React from 'react';
import TableFilter from './TableFilter';
import LocationFilter from './LocationFilter';
import StatusFilter from './StatusFilter';
import { FilterOptions } from '../../../lib/types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (key: keyof FilterOptions, value: string) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <TableFilter
        value={filters.search}
        onChange={(value) => onFilterChange('search', value)}
        placeholder="Search employee..."
      />
      <LocationFilter
        value={filters.location}
        onChange={(value) => onFilterChange('location', value)}
      />
      <StatusFilter
        value={filters.status}
        onChange={(value) => onFilterChange('status', value)}
      />
    </div>
  );
}