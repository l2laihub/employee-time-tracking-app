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
  employeeName: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';
  notes: string;
  timeEntries: TimeEntry[];
  totalHours: number;
  submittedAt?: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
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
  createdBy?: string;  // Track who created the request (admin or employee)
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
  ptoAllocation: {
    vacation: {
      type: 'auto' | 'manual';
      hours?: number;
    };
    sickLeave: {
      type: 'auto' | 'manual';
      hours?: number;
    };
  };
  ptoBalances?: Array<{
    type: PTOType;
    hours: number;
  }>;
}
