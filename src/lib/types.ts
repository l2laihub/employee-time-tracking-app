import type { Database } from './database.types';

export type JobLocation = Database['public']['Tables']['job_locations']['Row'];
export type TimeEntry = Database['public']['Tables']['time_entries']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type OrganizationInvite = Database['public']['Tables']['organization_invites']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export type UserRole = 'owner' | 'admin' | 'member';

export type JobLocationFormData = {
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_type: string;
  is_active: boolean;
};

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
  startDate: string;
  pto?: {
    vacation: {
      beginningBalance: number;
      ongoingBalance: number; // for transfers from other systems
      firstYearRule: number; // default 40 hours
      used?: number;
    };
    sickLeave: {
      beginningBalance: number;
      used?: number;
    };
  };
}
