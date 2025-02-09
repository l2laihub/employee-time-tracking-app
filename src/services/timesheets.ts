import { supabase } from '../lib/supabase'
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

interface EmployeeDetails {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  member_id: string;
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
    
    // Build the query
    let query = supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period_start_date', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
      
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

export async function getTimesheetDetails(timesheetId: string): Promise<{ timesheet: Timesheet | null; timeEntries: TimeEntry[]; employee: EmployeeDetails | null }> {
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

    // Get the user_id for this employee
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
        break_start,
        break_end,
        total_break_minutes,
        work_description,
        service_type,
        status,
        job_location:job_locations!inner (
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
    const totalHours = calculateTotalHours(timeEntries as unknown as TimeEntry[]);

    // Update timesheet with calculated total hours
    const { error: updateError } = await supabase
      .from('timesheets')
      .update({ total_hours: totalHours })
      .eq('id', timesheetId);

    if (updateError) {
      console.error('Error updating timesheet total hours:', updateError);
      // Don't throw here, just log the error
    } else {
      // Update the local timesheet object
      timesheet.total_hours = totalHours;
    }

    return {
      timesheet,
      timeEntries: timeEntries.map((entry) => ({
        ...entry,
        job_location: entry.job_location?.[0] || null
      })) as unknown as TimeEntry[],
      employee
    };
  } catch (error) {
    console.error('Error in getTimesheetDetails:', error);
    throw error;
  }
}

export async function updateTimesheetStatus(
  timesheetId: string,
  status: TimesheetStatus,
  reviewNotes?: string,
  totalHours?: number
): Promise<TimesheetResult> {
  console.log('Updating timesheet status:', { timesheetId, status, reviewNotes, totalHours });
  try {
    // First verify the timesheet exists
    const { data: existingTimesheet, error: getError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (getError) {
      console.error('Error getting timesheet:', getError);
      return {
        success: false,
        error: 'Timesheet not found'
      };
    }

    console.log('Found existing timesheet:', existingTimesheet);

    // Get the employee details to get the user_id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, member_id')
      .eq('id', existingTimesheet.employee_id)
      .single();

    if (employeeError) {
      console.error('Error getting employee:', employeeError);
      return {
        success: false,
        error: 'Failed to get employee details'
      };
    }

    // Get the user_id for this employee
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', employee.member_id)
      .single();

    if (memberError) {
      console.error('Error getting member data:', memberError);
      return {
        success: false,
        error: 'Failed to get member details'
      };
    }

    // Get time entries for this timesheet's period to calculate total hours
    const { data: timeEntries, error: entriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        organization_id,
        user_id,
        job_location_id,
        clock_in,
        clock_out,
        break_start,
        break_end,
        total_break_minutes,
        work_description,
        service_type,
        status,
        job_location:job_locations!inner (
          id,
          name,
          address
        )
      `)
      .eq('user_id', memberData.user_id)
      .gte('clock_in', `${existingTimesheet.period_start_date}T00:00:00`)
      .lte('clock_in', `${existingTimesheet.period_end_date}T23:59:59`);

    if (entriesError) {
      console.error('Error getting time entries:', entriesError);
      return {
        success: false,
        error: 'Failed to get time entries'
      };
    }

    // Calculate total hours from time entries
    const calculatedTotalHours = calculateTotalHours(timeEntries as unknown as TimeEntry[]);
    // If totalHours is provided and different from calculated, log a warning
    if (totalHours !== undefined && Math.abs(totalHours - calculatedTotalHours) > 0.01) {
      console.warn(`Provided total hours (${totalHours}) differs from calculated hours (${calculatedTotalHours})`);
    }
    const finalTotalHours = totalHours ?? calculatedTotalHours;

    // Get current timestamp
    const now = new Date().toISOString();

    // Prepare update data - explicitly set review_notes to null if undefined
    const updates = {
      status,
      updated_at: now,
      total_hours: finalTotalHours,
      review_notes: reviewNotes ?? null,
      ...(status === 'submitted' && !existingTimesheet.submitted_at && { submitted_at: now }),
      ...((status === 'approved' || status === 'rejected') && !existingTimesheet.reviewed_at && { reviewed_at: now })
    };

    console.log('Updating timesheet with data:', updates);

    // Perform the update
    const { error: updateError } = await supabase
      .from('timesheets')
      .update(updates)
      .eq('id', timesheetId);

    if (updateError) {
      console.error('Error updating timesheet:', updateError);
      return {
        success: false,
        error: 'Failed to update timesheet status'
      };
    }

    // Add a small delay before verification to ensure update has propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the updated timesheet
    const { data: updatedTimesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (fetchError || !updatedTimesheet) {
      console.error('Error getting updated timesheet:', fetchError);
      return {
        success: false,
        error: 'Failed to verify timesheet update'
      };
    }

    console.log('Retrieved updated timesheet for verification:', updatedTimesheet);

    // Get the final time entries
    const { data: finalTimeEntries, error: finalEntriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        organization_id,
        user_id,
        job_location_id,
        clock_in,
        clock_out,
        break_start,
        break_end,
        total_break_minutes,
        work_description,
        service_type,
        status,
        job_location:job_locations!inner (
          id,
          name,
          address
        )
      `)
      .eq('user_id', memberData.user_id)
      .gte('clock_in', `${updatedTimesheet.period_start_date}T00:00:00`)
      .lte('clock_in', `${updatedTimesheet.period_end_date}T23:59:59`);

    if (finalEntriesError) {
      console.error('Error getting final time entries:', finalEntriesError);
      return {
        success: false,
        error: 'Failed to get time entries'
      };
    }

    // Verify the update was successful with tolerance for floating point comparison
    const hoursDiff = Math.abs(updatedTimesheet.total_hours - finalTotalHours);
    const hoursMatch = hoursDiff < 0.01;
    const statusMatch = updatedTimesheet.status === status;
    
    // Handle null/undefined/empty string equivalence for review notes
    const normalizeNotes = (notes: string | null | undefined) => {
      if (notes === '' || notes === undefined || notes === null) return null;
      return String(notes).trim();
    };

    const normalizedActual = normalizeNotes(updatedTimesheet.review_notes);
    const normalizedExpected = normalizeNotes(reviewNotes);
    const notesMatch = normalizedActual === normalizedExpected;

    console.log('Raw values comparison:', {
      hours: {
        actual: updatedTimesheet.total_hours,
        expected: finalTotalHours,
        difference: hoursDiff,
        actualType: typeof updatedTimesheet.total_hours,
        expectedType: typeof finalTotalHours
      },
      status: {
        actual: updatedTimesheet.status,
        expected: status,
        actualType: typeof updatedTimesheet.status,
        expectedType: typeof status
      },
      notes: {
        actual: updatedTimesheet.review_notes,
        expected: reviewNotes,
        actualType: typeof updatedTimesheet.review_notes,
        expectedType: typeof reviewNotes,
        normalizedActual,
        normalizedExpected,
        actualIsNull: updatedTimesheet.review_notes === null,
        expectedIsNull: reviewNotes === null
      }
    });
    
    console.log('Verification details:', {
      hoursMatch,
      statusMatch,
      notesMatch,
      hours: { 
        expected: finalTotalHours, 
        actual: updatedTimesheet.total_hours, 
        diff: Math.abs(updatedTimesheet.total_hours - finalTotalHours),
        tolerance: 0.01
      },
      status: { 
        expected: status, 
        actual: updatedTimesheet.status,
        match: statusMatch
      },
      notes: { 
        expected: reviewNotes, 
        actual: updatedTimesheet.review_notes,
        expectedType: typeof reviewNotes,
        actualType: typeof updatedTimesheet.review_notes,
        normalizedExpected: normalizeNotes(reviewNotes),
        normalizedActual: normalizeNotes(updatedTimesheet.review_notes),
        match: notesMatch
      }
    });

    if (!hoursMatch || !statusMatch || !notesMatch) {
      console.error('Update verification failed. Expected vs Actual:', {
        total_hours: { expected: finalTotalHours, actual: updatedTimesheet.total_hours, match: hoursMatch },
        status: { expected: status, actual: updatedTimesheet.status, match: statusMatch },
        review_notes: { expected: reviewNotes, actual: updatedTimesheet.review_notes, match: notesMatch }
      });
      return {
        success: false,
        error: 'Update verification failed - changes were not saved correctly'
      };
    }

    // Combine the updated timesheet with time entries
    const timesheetWithEntries = {
      ...updatedTimesheet,
      time_entries: finalTimeEntries.map((entry) => ({
        ...entry,
        job_location: entry.job_location?.[0] || null
      })) as unknown as TimeEntry[]
    };

    console.log('Timesheet updated successfully:', timesheetWithEntries);
    return {
      success: true,
      data: timesheetWithEntries as Timesheet
    };
  } catch (error) {
    console.error('Timesheet status update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateTimeEntry(entry: TimeEntry & { timesheet_id?: string }): Promise<TimeEntry> {
  try {
    console.log('Updating time entry:', entry);

    // First update the time entry
    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        job_location_id: entry.job_location_id,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out,
        break_start: entry.break_start,
        break_end: entry.break_end,
        total_break_minutes: entry.total_break_minutes || 0,
        work_description: entry.work_description,
        service_type: entry.service_type,
        status: entry.status
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error('Error updating time entry:', updateError);
      throw new Error('Failed to update time entry');
    }

    // Get the updated time entry to verify changes
    const { data, error: getUpdatedError } = await supabase
      .from('time_entries')
      .select(`
        id,
        organization_id,
        user_id,
        job_location_id,
        clock_in,
        clock_out,
        break_start,
        break_end,
        total_break_minutes,
        work_description,
        service_type,
        status,
        job_location:job_locations!inner (
          id,
          name,
          address
        )
      `)
      .eq('id', entry.id)
      .single();

    if (getUpdatedError) {
      console.error('Error getting updated time entry:', getUpdatedError);
      throw new Error('Failed to retrieve updated time entry');
    }

    // Get the timesheet - first try by timesheet_id, then by date range
    let timesheet;
    if (entry.timesheet_id) {
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', entry.timesheet_id)
        .single();

      if (!timesheetError) {
        timesheet = timesheetData;
      } else {
        console.error('Error finding timesheet by id:', timesheetError);
      }
    }

    // If we couldn't find the timesheet by id, try by date range
    if (!timesheet && entry.clock_in) {
      // Get employee_id from the time entry's user_id
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('member_id', entry.user_id)
        .single();

      if (!employeeError && employeeData) {
        const { data: timesheetData, error: timesheetError } = await supabase
          .from('timesheets')
          .select('*')
          .eq('employee_id', employeeData.id)
          .gte('period_start_date', entry.clock_in?.split('T')[0])
          .lte('period_end_date', entry.clock_out?.split('T')[0])
          .single();

        if (!timesheetError) {
          timesheet = timesheetData;
        } else {
          console.error('Error finding timesheet by date range:', timesheetError);
        }
      }
    }

    // If we found a timesheet, update its total hours
    if (timesheet) {
      // Get all time entries for this timesheet period
      const { data: timeEntries, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          organization_id,
          user_id,
          job_location_id,
          clock_in,
          clock_out,
          break_start,
          break_end,
          total_break_minutes,
          work_description,
          service_type,
          status,
          job_location:job_locations!inner (
            id,
            name,
            address
          )
        `)
        .eq('user_id', data.user_id)
        .gte('clock_in', `${timesheet.period_start_date}T00:00:00`)
        .lte('clock_in', `${timesheet.period_end_date}T23:59:59`);

      if (entriesError) {
        console.error('Error getting time entries:', entriesError);
      } else if (timeEntries) {
        // Calculate and update total hours
        const totalHours = calculateTotalHours(timeEntries as unknown as TimeEntry[]);
        const { error: updateTimesheetError } = await supabase
          .from('timesheets')
          .update({ total_hours: totalHours })
          .eq('id', timesheet.id);

        if (updateTimesheetError) {
          console.error('Error updating timesheet total hours:', updateTimesheetError);
        }
      }
    }

    console.log('Final updated entry:', data);
    return {
      ...data,
      job_location: data.job_location?.[0] || null
    } as TimeEntry;
  } catch (error) {
    console.error('Error in updateTimeEntry:', error);
    throw error;
  }
}
