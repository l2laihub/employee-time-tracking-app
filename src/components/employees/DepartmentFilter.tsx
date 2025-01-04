import React from 'react';
import { Building2 } from 'lucide-react';
import { DEPARTMENTS } from '../../lib/constants/departments';

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DepartmentFilter({ value, onChange }: DepartmentFilterProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Building2 className="h-4 w-4 text-gray-400" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="">All Departments</option>
        {DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>
  );
}