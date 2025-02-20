// Employee Types
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  start_date?: string;
  status: 'active' | 'inactive';
  pto: {
    vacation: {
      beginningBalance: number;
      ongoingBalance: number;
      firstYearRule: number;
      used: number;
    };
    sickLeave: {
      beginningBalance: number;
      used: number;
    };
  };
}

export interface EmployeeFilters {
  search: string;
  role: string;
  department: string;
  status: 'active' | 'all' | 'inactive';
}

export interface SortConfig {
  column: 'name' | 'department' | 'role' | 'start_date' | 'status';
  direction: 'asc' | 'desc';
}

// Other types...
