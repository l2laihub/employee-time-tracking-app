// Core application types
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee';

// Location types
export interface JobLocation {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  service_type: string | { id: string; name: string }; 
  type: 'commercial' | 'residential';
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
}

// Timesheet types
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Time entry types
export type TimeEntryStatus = 'active' | 'break' | 'completed' | 'inactive';

export interface Timesheet {
  id: string;
  organization_id: string;
  employee_id: string;
  period_start_date: string;  // ISO date string YYYY-MM-DD
  period_end_date: string;    // ISO date string YYYY-MM-DD
  status: TimesheetStatus;
  total_hours: number;
  submitted_at?: string;  // ISO datetime string
  reviewed_by?: string;
  reviewed_at?: string;  // ISO datetime string
  review_notes?: string;
  employee?: {  // Changed from employees to employee to match query
    first_name: string;
    last_name: string;
    department: string;
  };
}

export interface TimeEntry {
  id: string;
  organization_id: string;
  user_id: string;
  job_location_id: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  service_type: string | null;
  work_description: string | null;
  status: TimeEntryStatus | null;
  job_location?: {
    id: string;
    name: string;
    address: string;
  };
}

// Database response types
export interface TimesheetWithEntries extends Timesheet {
  time_entries: TimeEntry[];
}

// Service result types
export type TimesheetResult = TimesheetWithEntries | null;
export type TimeEntryResult = TimeEntry | null;
export type TimesheetListResult = Timesheet[];
