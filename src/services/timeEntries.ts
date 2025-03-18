import { supabase } from '../lib/supabase'
import { TimeEntry, TimeEntryStatus } from '../types/custom.types'

export interface TimeEntryResult {
  success: boolean
  data?: TimeEntry | TimeEntry[]
  error?: string
}

// Validation helper functions
async function getTimeEntryStatus(timeEntryId: string): Promise<TimeEntryStatus | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('status')
    .eq('id', timeEntryId)
    .single();

  if (error) {
    console.error('Error fetching time entry status:', error);
    return null;
  }
  
  return data?.status as TimeEntryStatus | null;
}

/**
 * Validates that a service type is valid for a job location
 */
export async function validateServiceTypeForJobLocation(
  jobLocationId: string,
  serviceType: string | null
): Promise<{ valid: boolean; message?: string }> {
  try {
    console.log('Validating service type for job location:', {
      jobLocationId,
      serviceType
    });

    // If service type is null, we'll allow it (some job locations might not require a service type)
    if (serviceType === null) {
      console.log('Service type is null, allowing it');
      return { valid: true };
    }

    // Fetch the job location to get its service type
    const { data, error } = await supabase
      .from('job_locations')
      .select(`
        id,
        name,
        service_type,
        service_types:service_type (
          id,
          name
        )
      `)
      .eq('id', jobLocationId)
      .single();

    if (error) {
      console.error('Error fetching job location:', error);
      return {
        valid: false,
        message: `Error validating service type: ${error.message}`
      };
    }

    if (!data) {
      console.error('Job location not found:', jobLocationId);
      return {
        valid: false,
        message: 'Job location not found'
      };
    }

    console.log('Job location data:', data);

    // If the job location doesn't have a service type, any service type is valid
    if (data.service_type === null) {
      console.log('Job location has no service type requirement, all service types are valid');
      return { valid: true };
    }

    // Normalize service types to strings for comparison
    const jobServiceType = typeof data.service_type === 'object' && data.service_type !== null
      ? data.service_type.id
      : String(data.service_type);

    const normalizedServiceType = String(serviceType);

    console.log('Comparing service types:', {
      jobServiceType,
      normalizedServiceType,
      match: jobServiceType === normalizedServiceType
    });

    if (jobServiceType !== normalizedServiceType) {
      // Get the service type name for a more helpful error message
      let serviceName = 'Unknown';
      
      // Handle the service_types field safely
      if (data.service_types) {
        // First convert to unknown, then to the expected type to avoid TypeScript errors
        const serviceTypeData = data.service_types as unknown;
        
        // Check if it's an object with a name property
        if (serviceTypeData && 
            typeof serviceTypeData === 'object' && 
            'name' in serviceTypeData && 
            typeof serviceTypeData.name === 'string') {
          serviceName = serviceTypeData.name;
        }
      }

      return {
        valid: false,
        message: `Invalid service type for selected job. Expected: ${serviceName} (${jobServiceType})`
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Service type validation error:', error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error validating service type'
    };
  }
}

/**
 * Validates time entry data
 */
export function validateTimeEntry(entry: Partial<TimeEntry>): void {
  console.log('Validating time entry data:', entry);
  
  if (!entry.user_id) {
    throw new Error('User ID is required');
  }

  if (!entry.organization_id) {
    throw new Error('Organization ID is required');
  }

  if (!entry.job_location_id) {
    throw new Error('Job location ID is required');
  }

  // Service type is optional, so we don't validate it here
  // The validateServiceTypeForJobLocation function will handle validation if a service type is provided
  
  console.log('Time entry validation passed');
}

export async function createTimeEntry(entry: Partial<TimeEntry>): Promise<TimeEntryResult> {
  try {
    // Validate the entry data
    validateTimeEntry(entry);

    // Check if there's already an active entry for this user
    const activeEntryResult = await getActiveTimeEntry(entry.user_id!);
    if (activeEntryResult.success && activeEntryResult.data) {
      return {
        success: false,
        error: 'User already has an active time entry'
      };
    }

    // Validate that the service type is valid for the job location
    // Only validate if a service type is provided
    if (entry.service_type) {
      console.log('Validating service type for job location:', {
        jobLocationId: entry.job_location_id,
        serviceType: entry.service_type
      });
      
      const serviceTypeValidation = await validateServiceTypeForJobLocation(
        entry.job_location_id!,
        entry.service_type
      );

      if (!serviceTypeValidation.valid) {
        console.error('Service type validation failed:', serviceTypeValidation.message);
        return {
          success: false,
          error: serviceTypeValidation.message
        };
      }
    } else {
      console.log('No service type provided, skipping validation');
    }

    console.log('Service type validation passed or skipped, creating time entry');

    // Create the time entry with only fields from the TimeEntry interface
    const now = new Date().toISOString();
    const timeEntry: Partial<TimeEntry> = {
      organization_id: entry.organization_id,
      user_id: entry.user_id,
      job_location_id: entry.job_location_id,
      service_type: entry.service_type,
      work_description: entry.work_description || '',
      status: 'active',
      clock_in: now,
      clock_out: null,
      break_start: null,
      break_end: null,
      total_break_minutes: 0
    };

    console.log('Creating time entry with data:', timeEntry);

    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntry)
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('Time entry created successfully:', data);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error in createTimeEntry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while creating time entry'
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
      .eq('employee_id', timesheet.employee_id)
      .gte('entry_date', timesheet.period_start_date)
      .lte('entry_date', timesheet.period_end_date)
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

/**
 * Get the active time entry for a user
 */
export async function getActiveTimeEntry(userId: string): Promise<TimeEntryResult> {
  try {
    console.log('Getting active time entry for user:', userId);
    
    // First, try to get the active time entry without the job_locations join
    // to avoid potential schema issues
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .in('status', ['active', 'break'])
      .order('clock_in', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching active time entry:', error);
      throw error;
    }

    // If no active time entry is found
    if (!data || data.length === 0) {
      console.log('No active time entry found for user:', userId);
      return { success: true };
    }

    // If we found an active time entry, get the job location details separately
    const timeEntry = data[0] as TimeEntry;
    console.log('Found active time entry:', timeEntry);

    // If the time entry has a job_location_id, fetch the job location details
    if (timeEntry.job_location_id) {
      const { data: jobLocationData, error: jobLocationError } = await supabase
        .from('job_locations')
        .select(`
          id,
          name,
          address,
          service_type,
          service_types:service_type (
            id,
            name
          )
        `)
        .eq('id', timeEntry.job_location_id)
        .single();

      if (!jobLocationError && jobLocationData) {
        // Add the job location data to the time entry
        timeEntry.job_location = {
          id: jobLocationData.id,
          name: jobLocationData.name,
          address: jobLocationData.address || ''
        };
      }
    }

    return {
      success: true,
      data: timeEntry
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

export async function clockOut(timeEntryId: string, workDescription?: string): Promise<TimeEntryResult> {
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

    const updateData: Partial<TimeEntry> = {
      status: 'completed',
      clock_out: new Date().toISOString()
    };

    // Add work description if provided
    if (workDescription !== undefined) {
      updateData.work_description = workDescription;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
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
