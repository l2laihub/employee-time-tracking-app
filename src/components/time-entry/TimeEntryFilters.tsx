import React from 'react';
import { X } from 'lucide-react';
import { Card, Select, Button } from '../design-system';
import type { JobLocation } from '../../lib/types';

export interface TimeEntryFilters {
  status?: 'active' | 'break' | 'completed';
  locationId?: string;
}

interface TimeEntryFiltersProps {
  /**
   * Current filter values
   */
  filters: TimeEntryFilters;

  /**
   * Available job locations
   */
  locations: JobLocation[];

  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: TimeEntryFilters) => void;

  /**
   * Callback when filters panel is closed
   */
  onClose: () => void;
}

/**
 * Filter panel for time entries
 */
export default function TimeEntryFilters({
  filters,
  locations,
  onFiltersChange,
  onClose
}: TimeEntryFiltersProps) {
  return (
    <Card className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-neutral-700">
          Filter Time Entries
        </h3>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-500 transition-colors"
          aria-label="Close filters"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          value={filters.status || ''}
          onChange={(e) => {
            const value = e.target.value as '' | 'active' | 'break' | 'completed';
            onFiltersChange({
              ...filters,
              status: value || undefined
            });
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="break">On Break</option>
          <option value="completed">Completed</option>
        </Select>

        <Select
          value={filters.locationId || ''}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              locationId: e.target.value || undefined
            });
          }}
        >
          <option value="">All Locations</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>

        <Button
          variant="secondary"
          onClick={() => onFiltersChange({})}
          className="self-end"
        >
          Clear Filters
        </Button>
      </div>
    </Card>
  );
}