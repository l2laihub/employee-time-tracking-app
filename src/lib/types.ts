export interface TimeEntry {
  id: string;
  userId: string;
  jobLocationId: string;
  clockIn: string;
  clockOut: string | null;
  serviceType: 'hvac' | 'plumbing' | 'both';
  workDescription: string;
  status: 'completed' | 'in-progress';
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes: string;
  timeEntries: TimeEntry[];
  totalHours: number;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface JobLocation {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  address: string;
  city: string;
  state: string;
  zip: string;
  serviceType: 'hvac' | 'plumbing' | 'both';
  isActive: boolean;
}

export type PTOType = 'vacation' | 'sick_leave';

export interface PTORequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: PTOType;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive';
  department?: string;
  startDate: string; // Required for PTO calculations
}
