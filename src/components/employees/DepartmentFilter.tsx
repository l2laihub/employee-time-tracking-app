import React from 'react';
import { Building2 } from 'lucide-react';
import { Select } from '../design-system';
import { DEPARTMENTS } from '../../lib/constants/departments';

interface DepartmentFilterProps {
  /**
   * Currently selected department value
   */
  value: string;

  /**
   * Callback when department selection changes
   */
  onChange: (value: string) => void;
}

/**
 * Department selection filter component
 */
export default function DepartmentFilter({ value, onChange }: DepartmentFilterProps) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<Building2 className="h-4 w-4" />}
    >
      <option value="">All Departments</option>
      {DEPARTMENTS.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </Select>
  );
}