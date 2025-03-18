import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Select } from '../design-system';
import { getDepartments } from '../../services/departments';

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
  const [departments, setDepartments] = useState<string[]>([]);
  
  useEffect(() => {
    // Fetch departments from the database
    const loadDepartments = async () => {
      try {
        const fetchedDepartments = await getDepartments();
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };

    loadDepartments();
  }, []);

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<Building2 className="h-4 w-4" />}
      aria-label="Filter by department"
      title="Filter by department"
    >
      <option value="">All Departments</option>
      {departments.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </Select>
  );
}