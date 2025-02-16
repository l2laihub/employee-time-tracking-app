import { supabase } from '../lib/supabase';
import { getVacationBalance, getSickLeaveBalance } from '../utils/ptoCalculations';
import { Database } from '../types/database.types';
import { Employee, TimesheetEntry } from '../lib/types';

type Tables = Database['public']['Tables'];
type PTORequestRow = Tables['pto_requests']['Row'];
type PTORequestInsert = Tables['pto_requests']['Insert'];
type TimesheetRow = Tables['timesheets']['Row'];
type TimeEntryRow = Tables['time_entries']['Row'];

export interface PTORequest {
  id: string;
  organization_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: 'vacation' | 'sick';
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
}

interface PTOBalance {
  available: number;
  used: number;
  pending: number;
}

interface PTOFilters {
  userId?: string;
  status?: PTORequest['status'];
  startDate?: string;
  endDate?: string;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a new PTO request
 */
export async function createPTORequest(
  organization_id: string,
  user_id: string,
  start_date: string,
  end_date: string,
  type: PTORequest['type'],
  hours: number,
  notes: string
): Promise<ServiceResponse<PTORequest>> {
  try {
    const { data, error } = await supabase
      .from('pto_requests')
      .insert({
        organization_id,
        user_id,
        start_date,
        end_date,
        type,
        status: 'pending',
        notes
      } as PTORequestInsert)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as PTORequest };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create PTO request'
    };
  }
}

/**
 * Update an existing PTO request
 */
export async function updatePTORequest(
  id: string,
  updates: Partial<Pick<PTORequest, 'status' | 'notes'>>
): Promise<ServiceResponse<PTORequest>> {
  try {
    const { data, error } = await supabase
      .from('pto_requests')
      .update(updates as Partial<PTORequestRow>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as PTORequest };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update PTO request'
    };
  }
}

/**
 * Delete a PTO request
 */
export async function deletePTORequest(id: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('pto_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete PTO request'
    };
  }
}

/**
 * List PTO requests with optional filters
 */
export async function listPTORequests(
  organization_id: string,
  filters?: PTOFilters
): Promise<ServiceResponse<PTORequest[]>> {
  try {
    let query = supabase
      .from('pto_requests')
      .select('*')
      .eq('organization_id', organization_id);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data as PTORequest[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list PTO requests'
    };
  }
}

/**
 * Get PTO balance for a user
 */
export async function getPTOBalance(
  organization_id: string,
  user_id: string,
  type: PTORequest['type']
): Promise<ServiceResponse<PTOBalance>> {
  try {
    // Get employee data
    const { data: employeeData, error: employeeError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (employeeError) throw employeeError;
    if (!employeeData) throw new Error('Employee not found');

    // Get timesheets with time entries for sick leave calculation
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select(`
        *,
        time_entries (
          id,
          user_id,
          job_location_id,
          entry_date,
          start_time,
          end_time,
          break_duration,
          work_description,
          organization_id,
          created_at,
          updated_at
        )
      `)
      .eq('employee_id', user_id)
      .eq('organization_id', organization_id)
      .eq('status', 'approved');

    if (timesheetsError) throw timesheetsError;

    // Get approved PTO requests
    const { data: approvedRequests, error: approvedError } = await supabase
      .from('pto_requests')
      .select('*')
      .eq('user_id', user_id)
      .eq('organization_id', organization_id)
      .eq('type', type)
      .eq('status', 'approved');

    if (approvedError) throw approvedError;

    // Get pending PTO requests
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('pto_requests')
      .select('*')
      .eq('user_id', user_id)
      .eq('organization_id', organization_id)
      .eq('type', type)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // Convert database data to types expected by calculation functions
    const employee: Employee = {
      ...employeeData,
      start_date: employeeData.start_date,
      pto: {
        vacation: {
          beginningBalance: 0,
          ongoingBalance: 0,
          used: approvedRequests?.length || 0
        },
        sickLeave: {
          beginningBalance: 0,
          used: approvedRequests?.length || 0
        }
      }
    };

    // Convert timesheets to expected format for sick leave calculation
    const timesheetEntries: TimesheetEntry[] = (timesheets || []).map((ts: TimesheetRow & { time_entries: TimeEntryRow[] }) => ({
      id: ts.id,
      userId: ts.employee_id,
      employeeName: '', // Not needed for calculation
      organization_id: ts.organization_id,
      weekStartDate: ts.period_start_date,
      weekEndDate: ts.period_end_date,
      status: ts.status as TimesheetEntry['status'],
      totalHours: ts.total_hours,
      notes: ts.review_notes || '',
      reviewedBy: ts.reviewed_by || '',
      reviewedAt: ts.reviewed_at || '',
      timeEntries: ts.time_entries.map(entry => ({
        id: entry.id,
        clockIn: `${entry.entry_date}T${entry.start_time}Z`,
        clockOut: `${entry.entry_date}T${entry.end_time}Z`,
        jobLocationId: entry.job_location_id,
        // Additional fields from the existing schema
        breakDuration: entry.break_duration,
        workDescription: entry.work_description,
        organizationId: entry.organization_id
      }))
    }));

    // Calculate balances using existing business logic
    const available = type === 'vacation'
      ? getVacationBalance(employee)
      : getSickLeaveBalance(employee, timesheetEntries);

    const used = approvedRequests?.length || 0;
    const pending = pendingRequests?.length || 0;

    return {
      success: true,
      data: {
        available,
        used,
        pending
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get PTO balance'
    };
  }
}
