import React from 'react';
import { Search, Users, UserCheck } from 'lucide-react';
import DepartmentFilter from './DepartmentFilter';
import type { EmployeeFilters as EmployeeFiltersType } from '../../lib/types';

interface EmployeeFiltersProps {
  filters: EmployeeFiltersType;
  onFilterChange: (key: string, value: string) => void;
}

export default function EmployeeFilters({ filters, onFilterChange }: EmployeeFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search employees..."
        />
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Users className="h-4 w-4 text-gray-400" />
        </div>
        <select
          value={filters.role}
          onChange={(e) => onFilterChange('role', e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <UserCheck className="h-4 w-4 text-gray-400" />
        </div>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="active">Active Only</option>
          <option value="all">All Employees</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <DepartmentFilter
        value={filters.department}
        onChange={(value) => onFilterChange('department', value)}
      />
    </div>
  );
}