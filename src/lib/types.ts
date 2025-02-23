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
  photo_url?: string | null;
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

// Job Location Types
export interface JobLocation {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  address: string;
  city: string;
  state: string;
  zip: string;
  is_active: boolean;
}

// Time Entry Types
export interface TimeEntry {
  id: string;
  user_id: string;
  job_location_id: string;
  clock_in: string;
  clock_out?: string;
  status: 'active' | 'break' | 'completed';
  work_description?: string;
  created_at: string;
  updated_at: string;
}
