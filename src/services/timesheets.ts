import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'
import { Timesheet, TimeEntry, TimesheetStatus } from '../types/custom.types'

export interface TimesheetResult {
  success: boolean
  data?: Timesheet | Timesheet[]
  error?: string
}

export interface TimeEntryResult {
  success: boolean
  data?: TimeEntry | TimeEntry[]
  error?: string
}

export async function createTimesheet(
  employeeId: string,
  organizationId: string,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<TimesheetResult> {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        employee_id: employeeId,
        organization_id: organizationId,
        period_start_date: periodStartDate.toISOString().split('T')[0],
        period_end_date: periodEndDate.toISOString().split('T')[0],
        status: 'draft',
        total_hours: 0
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Timesheet
    };
  } catch (error) {
    console.error('Timesheet creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getTimesheetById(timesheetId: string): Promise<TimesheetResult> {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        time_entries (*)
      `)
      .eq('id', timesheetId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Timesheet
    };
  } catch (error) {
    console.error('Timesheet fetch failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listTimesheetsForEmployee(
  employeeId: string,
  status?: TimesheetStatus,
  startDate?: Date,
  endDate?: Date
): Promise<TimesheetResult> {
  try {
    console.log('Fetching timesheets for employee:', employeeId);
    
    // Build the query filters
    const filters = {
      employee_id: employeeId
    };
    
    if (status) {
      console.log('Filtering by status:', status);
      filters['status'] = status;
    }
    
    // First get all timesheets for this employee
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .match(filters)
      .order('period_start_date', { ascending: false });
      
    console.log('Raw timesheet query result:', { data, error });

    if (error) throw error;
    
    // Then filter by dates in JavaScript
    let filteredData = data;
    if (startDate) {
      const startStr = startDate.toISOString().split('T')[0];
      console.log('Filtering by start date:', startStr);
      filteredData = filteredData.filter(t => t.period_end_date >= startStr);
    }
    
    if (endDate) {
      const endStr = endDate.toISOString().split('T')[0];
      console.log('Filtering by end date:', endStr);
      filteredData = filteredData.filter(t => t.period_start_date <= endStr);
    }
    
    console.log('Filtered timesheet result:', filteredData);

    return {
      success: true,
      data: filteredData as Timesheet[]
    };
  } catch (error) {
    console.error('Timesheet listing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listTimesheetsForOrganization(
  organizationId: string,
  status?: TimesheetStatus,
  startDate?: Date,
  endDate?: Date
): Promise<TimesheetResult> {
  try {
    console.log('Fetching timesheets for organization:', organizationId);
    console.log('Filters:', { status, startDate, endDate });

    // First get timesheets
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start_date', { ascending: false });

    if (timesheetsError) {
      console.error('Error fetching timesheets:', timesheetsError);
      throw timesheetsError;
    }

    console.log('Fetched timesheets:', timesheets);

    // Then get employees for these timesheets
    if (timesheets && timesheets.length > 0) {
      const employeeIds = [...new Set(timesheets.map(t => t.employee_id))];
      console.log('Fetching employees:', employeeIds);

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, department')
        .in('id', employeeIds);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      console.log('Fetched employees:', employees);

      // Combine timesheet and employee data
      const timesheetsWithEmployees = timesheets.map(timesheet => ({
        ...timesheet,
        employee: employees?.find(e => e.id === timesheet.employee_id)
      }));

      console.log('Combined data:', timesheetsWithEmployees);

      return {
        success: true,
        data: timesheetsWithEmployees as Timesheet[]
      };
    }

    return {
      success: true,
      data: timesheets as Timesheet[]
    };
  } catch (error) {
    console.error('Organization timesheet listing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getTimesheetDetails(timesheetId: string): Promise<{ timesheet: Timesheet | null; timeEntries: TimeEntry[]; employee: any }> {
  try {
    // Get the timesheet
    const { data: timesheet, error: timesheetError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (timesheetError) {
      console.error('Error fetching timesheet:', timesheetError);
      throw timesheetError;
    }

    if (!timesheet) {
      console.error('No timesheet found with id:', timesheetId);
      return { timesheet: null, timeEntries: [], employee: null };
    }

    console.log('Found timesheet:', timesheet);

    // Get the employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, department, member_id')
      .eq('id', timesheet.employee_id)
      .single();

    if (employeeError) {
      console.error('Error fetching employee:', employeeError);
      throw employeeError;
    }

    console.log('Found employee:', employee);

    // Debug: Check what time entries exist for this employee
    const { data: allEntries, error: allEntriesError } = await supabase
      .from('time_entries')
      .select('*');

    console.log('All time entries in database:', allEntries);

    // Debug: Get the user_id for this employee
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', employee.member_id)
      .single();

    if (memberError) {
      console.error('Error getting member data:', memberError);
      throw memberError;
    }

    console.log('Found member data:', memberData);

    // Get time entries for this timesheet's period
    console.log('Fetching time entries with params:', {
      user_id: memberData.user_id,
      period_start: timesheet.period_start_date,
      period_end: timesheet.period_end_date
    });

    const { data: timeEntries, error: entriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        organization_id,
        user_id,
        job_location_id,
        clock_in,
        clock_out,
        total_break_minutes,
        work_description,
        status,
        job_location:job_locations (
          id,
          name,
          address
        )
      `)
      .eq('user_id', memberData.user_id)
      .gte('clock_in', `${timesheet.period_start_date}T00:00:00`)
      .lte('clock_in', `${timesheet.period_end_date}T23:59:59`)
      .order('clock_in', { ascending: true });

    if (entriesError) {
      console.error('Error fetching time entries:', entriesError);
      throw entriesError;
    }

    console.log('Found time entries for period:', timeEntries);

    // Calculate total hours
    const totalHours = calculateTotalHours(timeEntries);

    // Update timesheet with calculated total hours
    const { error: updateError } = await supabase
      .from('timesheets')
      .update({ total_hours: totalHours })
      .eq('id', timesheetId);

    if (updateError) {
      console.error('Error updating timesheet total hours:', updateError);
      // Don't throw here, we can still return the data
    }

    // Return the updated timesheet with total hours
    return {
      timesheet: { ...timesheet, total_hours: totalHours, employee },
      timeEntries: timeEntries || [],
      employee
    };
  } catch (error) {
    console.error('Error getting timesheet details:', error);
    throw error;
  }
}

export async function updateTimesheetStatus(
  timesheetId: string,
  status: TimesheetStatus,
  reviewNotes?: string
): Promise<TimesheetResult> {
  try {
    const updates: Partial<Database['public']['Tables']['timesheets']['Update']> = {
      status,
      reviewed_at: status === 'approved' || status === 'rejected' ? new Date().toISOString() : null,
      review_notes: reviewNotes
    };

    if (status === 'submitted') {
      updates.submitted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('timesheets')
      .update(updates)
      .eq('id', timesheetId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Timesheet
    };
  } catch (error) {
    console.error('Timesheet status update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateTimeEntry(entry: TimeEntry): Promise<TimeEntry> {
  console.log('Updating time entry:', entry);

  // First get the existing entry to preserve required fields
  const { data: existingEntry, error: getError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', entry.id)
    .single();

  if (getError) {
    console.error('Error getting existing time entry:', getError);
    throw getError;
  }

  console.log('Found existing entry:', existingEntry);

  // Prepare minimal update data with required fields
  const updateData = {
    organization_id: existingEntry.organization_id,
    user_id: existingEntry.user_id,
    job_location_id: entry.job_location_id || existingEntry.job_location_id,
    service_type: existingEntry.service_type,
    status: existingEntry.status,
    clock_in: entry.clock_in,
    clock_out: entry.clock_out,
    total_break_minutes: entry.total_break_minutes || existingEntry.total_break_minutes,
    work_description: entry.work_description || existingEntry.work_description,
    updated_at: new Date().toISOString()
  };

  console.log('Updating with data:', updateData);

  // Update the entry
  const { data: updateResult, error: updateError } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', entry.id)
    .select();

  if (updateError) {
    console.error('Error updating time entry:', updateError);
    throw updateError;
  }

  console.log('Update result:', updateResult);

  if (!updateResult || updateResult.length === 0) {
    throw new Error('No rows were updated');
  }

  // Get the updated entry with job location data
  const { data, error: getUpdatedError } = await supabase
    .from('time_entries')
    .select(`
      id,
      organization_id,
      user_id,
      job_location_id,
      clock_in,
      clock_out,
      total_break_minutes,
      work_description,
      service_type,
      status,
      job_location:job_locations (
        id,
        name,
        address
      )
    `)
    .eq('id', entry.id)
    .single();

  if (getUpdatedError) {
    console.error('Error getting updated time entry:', getUpdatedError);
    throw getUpdatedError;
  }

  console.log('Final updated entry:', data);
  return data;
}

// Helper function to calculate total hours for a timesheet
function calculateTotalHours(timeEntries: TimeEntry[]): number {
  return timeEntries.reduce((total, entry) => {
    if (!entry.clock_in || !entry.clock_out) return total;

    const clockIn = new Date(entry.clock_in);
    const clockOut = new Date(entry.clock_out);
    const durationMs = clockOut.getTime() - clockIn.getTime();
    const durationHours = durationMs / (1000 * 60 * 60); // Convert ms to hours
    const breakHours = (entry.total_break_minutes || 0) / 60;

    return total + (durationHours - breakHours);
  }, 0);
}
