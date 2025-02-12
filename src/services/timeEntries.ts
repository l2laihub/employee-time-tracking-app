import { supabase } from '../lib/supabase'
import { TimeEntry } from '../types/custom.types'

export interface TimeEntryResult {
  success: boolean
  data?: TimeEntry | TimeEntry[]
  error?: string
}

// Validation helper functions
async function hasActiveTimeEntry(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['active', 'break'])
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
}

async function getTimeEntryStatus(timeEntryId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('status')
    .eq('id', timeEntryId)
    .single();

  if (error) throw error;
  return data?.status || null;
}

export async function createTimeEntry(
  userId: string,
  jobLocationId: string,
  serviceType: 'hvac' | 'plumbing' | 'both',
  workDescription: string,
  organizationId: string
): Promise<TimeEntryResult> {
  try {
    console.log('Creating time entry with data:', {
      userId,
      jobLocationId,
      serviceType,
      workDescription,
      organizationId
    });

    // Check if user already has an active time entry
    if (await hasActiveTimeEntry(userId)) {
      return {
        success: false,
        error: 'You already have an active time entry. Please clock out or end your break first.'
      };
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        job_location_id: jobLocationId,
        service_type: serviceType,
        work_description: workDescription,
        organization_id: organizationId,
        clock_in: new Date().toISOString(),
        status: 'active',
        total_break_minutes: 0
      })
      .select()
      .single();

    console.log('Time entry creation result:', { data, error });

    if (error) {
      console.error('Time entry creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
    if (!data) {
      return {
        success: false,
        error: 'No data returned after insert'
      };
    }

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Time entry creation error:', error);
    return {
      success: false,
      error: 'Database error'
    };
  }
}

export async function updateTimeEntry(
  timeEntryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntryResult> {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to update time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteTimeEntry(timeEntryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', timeEntryId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to delete time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listTimeEntriesByTimesheet(
  timesheetId: string
): Promise<TimeEntryResult> {
  try {
    const { data: timesheet, error: timesheetError } = await supabase
      .from('timesheets')
      .select('period_start_date, period_end_date, employee_id')
      .eq('id', timesheetId)
      .single();

    if (timesheetError) throw timesheetError;

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `)
      .eq('user_id', timesheet.employee_id)
      .gte('clock_in', timesheet.period_start_date)
      .lte('clock_in', timesheet.period_end_date)
      .order('clock_in', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry[]
    };
  } catch (error) {
    console.error('Failed to list time entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listTimeEntriesByDateRange(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntryResult> {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `)
      .eq('employee_id', employeeId)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry[]
    };
  } catch (error) {
    console.error('Failed to list time entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getTimeEntryById(timeEntryId: string): Promise<TimeEntryResult> {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `)
      .eq('id', timeEntryId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to get time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getActiveTimeEntry(userId: string): Promise<TimeEntryResult> {
  try {
    console.log('Getting active time entry for user:', userId);
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          id,
          name,
          service_type
        )
      `)
      .eq('user_id', userId)
      .is('clock_out', null)
      .in('status', ['active', 'break'])
      .order('clock_in', { ascending: false })
      .limit(1)
      .single();

    console.log('Active time entry result:', {
      data,
      error,
      hasData: !!data
    });

    if (error) {
      // PGRST116 means no rows returned, which is expected when there's no active entry
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: undefined
        };
      }
      throw error;
    }

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to get active time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function startBreak(timeEntryId: string): Promise<TimeEntryResult> {
  try {
    // Check current status
    const currentStatus = await getTimeEntryStatus(timeEntryId);
    if (!currentStatus) {
      return {
        success: false,
        error: 'Time entry not found'
      };
    }
    if (currentStatus !== 'active') {
      return {
        success: false,
        error: `Cannot start break: time entry is ${currentStatus}`
      };
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        status: 'break',
        break_start: new Date().toISOString()
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned after update');

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to start break:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function endBreak(timeEntryId: string): Promise<TimeEntryResult> {
  try {
    // Check current status
    const currentStatus = await getTimeEntryStatus(timeEntryId);
    if (!currentStatus) {
      return {
        success: false,
        error: 'Time entry not found'
      };
    }
    if (currentStatus !== 'break') {
      return {
        success: false,
        error: `Cannot end break: time entry is ${currentStatus}`
      };
    }

    // Get current entry to calculate break duration
    const { data: currentEntry, error: getError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', timeEntryId)
      .single();

    if (getError) throw getError;
    if (!currentEntry) throw new Error('Time entry not found');
    if (!currentEntry.break_start) {
      throw new Error('Break start time not found');
    }

    // Calculate break duration
    const breakStart = new Date(currentEntry.break_start);
    const breakEnd = new Date();
    const breakMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));
    const totalBreakMinutes = (currentEntry.total_break_minutes || 0) + breakMinutes;

    // First update: Set break end time and calculate total break minutes
    const { error: updateError1 } = await supabase
      .from('time_entries')
      .update({
        break_end: breakEnd.toISOString(),
        total_break_minutes: totalBreakMinutes
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (updateError1) throw updateError1;

    // Second update: Clear break times and set status to active
    const { data, error: updateError2 } = await supabase
      .from('time_entries')
      .update({
        status: 'active',
        break_start: null,
        break_end: null
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (updateError2) throw updateError2;
    if (!data) throw new Error('No data returned after update');

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to end break:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function clockOut(timeEntryId: string): Promise<TimeEntryResult> {
  try {
    // Check current status
    const currentStatus = await getTimeEntryStatus(timeEntryId);
    if (!currentStatus) {
      return {
        success: false,
        error: 'Time entry not found'
      };
    }
    if (currentStatus === 'completed') {
      return {
        success: false,
        error: 'Time entry is already completed'
      };
    }
    if (currentStatus === 'break') {
      return {
        success: false,
        error: 'Please end your break before clocking out'
      };
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        status: 'completed',
        clock_out: new Date().toISOString()
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned after update');

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Failed to clock out:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listTimeEntries(
  organizationId: string,
  filters?: {
    employeeId?: string;
    locationId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'active' | 'break' | 'completed';
  }
): Promise<TimeEntryResult> {
  try {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `)
      .eq('organization_id', organizationId)
      .order('clock_in', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.employeeId) {
        query = query.eq('user_id', filters.employeeId);
      }
      if (filters.locationId) {
        query = query.eq('job_location_id', filters.locationId);
      }
      if (filters.startDate) {
        query = query.gte('clock_in', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('clock_in', filters.endDate.toISOString());
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry[]
    };
  } catch (error) {
    console.error('Failed to list time entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
