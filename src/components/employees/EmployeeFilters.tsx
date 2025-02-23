import React from 'react';
import { Search, Users, UserCheck } from 'lucide-react';
import { Input, Select } from '../design-system';
import DepartmentFilter from './DepartmentFilter';
import type { EmployeeFilters as EmployeeFiltersType } from '../../lib/types';

interface EmployeeFiltersProps {
  /**
   * Current filter values
   */
  filters: EmployeeFiltersType;

  /**
   * Callback when a filter value changes
   */
  onFilterChange: (key: string, value: string) => void;
}

/**
 * Employee filtering controls component
 */
export default function EmployeeFilters({ filters, onFilterChange }: EmployeeFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Input
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        placeholder="Search employees..."
        leftIcon={<Search className="h-4 w-4" />}
      />

      <Select
        value={filters.role}
        onChange={(e) => onFilterChange('role', e.target.value)}
        leftIcon={<Users className="h-4 w-4" />}
      >
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="employee">Employee</option>
      </Select>

      <Select
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        leftIcon={<UserCheck className="h-4 w-4" />}
      >
        <option value="active">Active Only</option>
        <option value="all">All Employees</option>
        <option value="inactive">Inactive Only</option>
      </Select>

      <DepartmentFilter
        value={filters.department}
        onChange={(value) => onFilterChange('department', value)}
      />
    </div>
  );
}