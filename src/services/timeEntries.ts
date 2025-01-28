import { supabase } from '../lib/supabase'
import { addDays, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'

export interface TimeEntry {
  id: string
  user_id: string
  job_location_id: string
  start_time: string
  end_time?: string
  notes?: string
  break_duration?: number
  status: 'working' | 'break' | 'completed'
  organization_id: string
  created_at: string
  updated_at: string
}

export interface TimesheetEntry {
  weekStartDate: string
  weekEndDate: string
  totalHours: number
  entries: TimeEntry[]
}

export interface TimeEntryResult {
  success: boolean
  data?: TimeEntry | TimeEntry[]
  error?: string
}

export interface TimesheetResult {
  success: boolean
  data?: TimesheetEntry | TimesheetEntry[]
  error?: string
}

export async function createTimeEntry(
  userId: string,
  jobLocationId: string,
  clockIn: string,
  serviceType: 'hvac' | 'plumbing' | 'both',
  workDescription: string,
  organizationId: string
): Promise<TimeEntryResult> {
  try {
    console.log('Creating time entry:', {
      userId,
      jobLocationId,
      clockIn,
      serviceType,
      workDescription,
      organizationId
    });

    // First insert the time entry
    const { error: insertError } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        job_location_id: jobLocationId,
        start_time: clockIn,
        notes: workDescription,
        status: 'working',
        organization_id: organizationId,
        break_duration: 0
      });

    if (insertError) {
      console.error('Time entry creation error:', {
        error: insertError,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        message: insertError.message
      });
      throw insertError;
    }

    // Then fetch the created entry
    const { data: createdEntry, error: selectError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('job_location_id', jobLocationId)
      .eq('start_time', clockIn)
      .single();

    if (selectError) {
      console.error('Time entry fetch error:', selectError);
      throw selectError;
    }

    console.log('Time entry created:', createdEntry);
    return {
      success: true,
      data: createdEntry as TimeEntry
    };
  } catch (error) {
    console.error('Time entry creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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

export async function clockOut(
  timeEntryId: string,
  clockOut: string
): Promise<TimeEntryResult> {
  return updateTimeEntry(timeEntryId, {
    end_time: clockOut,
    status: 'completed'
  });
}

export async function listTimeEntries(
  organizationId: string,
  userId?: string
): Promise<TimeEntryResult> {
  try {
    let query = supabase
      .from('time_entries')
      .select()
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
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

export async function startBreak(timeEntryId: string): Promise<TimeEntryResult> {
  try {
    const { data: currentEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select()
      .eq('id', timeEntryId)
      .single();

    if (fetchError) throw fetchError;
    if (!currentEntry) throw new Error('Time entry not found');
    if (currentEntry.status !== 'working') throw new Error('Time entry must be working to start break');
    if (currentEntry.break_duration) throw new Error('Break already in progress');

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        status: 'break'
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;

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
    const { data: currentEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select()
      .eq('id', timeEntryId)
      .single();

    if (fetchError) throw fetchError;
    if (!currentEntry) throw new Error('Time entry not found');
    if (currentEntry.status !== 'break') throw new Error('Time entry must be in break status');

    const breakEnd = new Date();
    const breakMinutes = differenceInMinutes(breakEnd, new Date(currentEntry.start_time));
    const totalBreakMinutes = (currentEntry.break_duration || 0) + breakMinutes;

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: breakEnd.toISOString(),
        break_duration: totalBreakMinutes,
        status: 'working'
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;

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

export async function getTimesheet(
  userId: string,
  weekOffset: number = 0
): Promise<TimesheetResult> {
  try {
    const baseDate = new Date();
    const weekStart = startOfWeek(addDays(baseDate, weekOffset * 7));
    const weekEnd = endOfWeek(weekStart);

    const { data, error } = await supabase
      .from('time_entries')
      .select()
      .eq('user_id', userId)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    const entries = data as TimeEntry[];
    const totalHours = entries.reduce((total, entry) => {
      if (!entry.end_time) return total;
      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);
      const totalMinutes = differenceInMinutes(endTime, startTime) - (entry.break_duration || 0);
      return total + (totalMinutes / 60);
    }, 0);

    return {
      success: true,
      data: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        totalHours,
        entries
      }
    };
  } catch (error) {
    console.error('Failed to get timesheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getActiveTimeEntry(
  userId: string
): Promise<TimeEntryResult> {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select()
      .eq('user_id', userId)
      .eq('status', 'working')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

    return {
      success: true,
      data: data || undefined
    };
  } catch (error) {
    console.error('Failed to get active time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
