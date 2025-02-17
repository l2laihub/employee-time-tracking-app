import { supabase } from '../lib/supabase';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  jobLocationIds?: string[];
}

export interface WeeklyEmployeeHours {
  id: string;
  name: string;
  jobLocationIds: string[];
  hours: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  totalRegular: number;
  totalOT: number;
  vacationHours: number;
  sickLeaveHours: number;
  vacationBalance: number;
  sickLeaveBalance: number;
}

export interface EmployeeTimeEntry {
  date: string;
  timeIn: string;
  lunchStart: string;
  lunchEnd: string;
  timeOut: string;
  totalHours: number;
  lunchBreak: number;
  workedHours: number;
  jobLocation: string;
  status: string;
}

interface WeeklyHoursRow {
  id: string;
  name: string;
  organization_id: string;
  job_location_ids: string[];
  statuses: string[];
  monday: number | null;
  tuesday: number | null;
  wednesday: number | null;
  thursday: number | null;
  friday: number | null;
  saturday: number | null;
  sunday: number | null;
  total_regular: number | null;
  total_ot: number | null;
  vacation_hours: number | null;
  sick_leave_hours: number | null;
  vacation_balance: number | null;
  sick_leave_balance: number | null;
}

export class ReportsService {
  /**
   * Get weekly hours summary for employees
   */
  async getWeeklyHours(filters: ReportFilters): Promise<WeeklyEmployeeHours[]> {
    // First get the user's current organization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .single();

    if (memberError) {
      console.error('Error fetching organization member:', memberError);
      throw new Error('Failed to fetch organization data');
    }

    // Call the function with date range and organization_id
    const { data, error } = await supabase
      .rpc('get_weekly_employee_hours', {
        start_date: filters.startDate.toISOString(),
        end_date: filters.endDate.toISOString(),
        org_id: member.organization_id
      }) as { data: WeeklyHoursRow[] | null; error: any };

    if (error) {
      console.error('Error fetching weekly hours:', error);
      throw new Error('Failed to fetch weekly hours data');
    }

    if (!data) return [];

    return data.map(row => ({
      id: row.id,
      name: row.name,
      jobLocationIds: row.job_location_ids || [],
      statuses: row.statuses || [],
      hours: {
        monday: Number(row.monday) || 0,
        tuesday: Number(row.tuesday) || 0,
        wednesday: Number(row.wednesday) || 0,
        thursday: Number(row.thursday) || 0,
        friday: Number(row.friday) || 0,
        saturday: Number(row.saturday) || 0,
        sunday: Number(row.sunday) || 0
      },
      totalRegular: Number(row.total_regular) || 0,
      totalOT: Number(row.total_ot) || 0,
      vacationHours: Number(row.vacation_hours) || 0,
      sickLeaveHours: Number(row.sick_leave_hours) || 0,
      vacationBalance: Number(row.vacation_balance) || 0,
      sickLeaveBalance: Number(row.sick_leave_balance) || 0
    }));
  }

  /**
   * Get detailed time entries for a specific employee
   */
  async getEmployeeDetails(
    employeeId: string,
    filters: ReportFilters
  ): Promise<EmployeeTimeEntry[]> {
    // First get the organization_member record for this employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('member_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      throw new Error('Failed to fetch employee data');
    }

    // Then get the user_id from organization_members
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', employee.member_id)
      .single();

    if (memberError || !member) {
      console.error('Error fetching organization member:', memberError);
      throw new Error('Failed to fetch organization member data');
    }

    // Build query for time entries
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name
        )
      `)
      .eq('user_id', member.user_id)
      .gte('clock_in', filters.startDate.toISOString())
      .lte('clock_in', filters.endDate.toISOString());

    // Apply location filter if specified
    if (filters.jobLocationIds && filters.jobLocationIds.length > 0) {
      query = query.in('job_location_id', filters.jobLocationIds);
    }

    // Execute query with ordering
    const { data, error } = await query.order('clock_in', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      throw new Error('Failed to fetch time entries');
    }

    if (!data) return [];

    return data.map(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
      const totalHours = clockOut 
        ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        : 0;
      const breakMinutes = entry.total_break_minutes || 0;
      const workedHours = Math.max(0, totalHours - (breakMinutes / 60));

      // Helper to format time in UTC
      const formatUTCTime = (date: Date | null) => {
        if (!date) return '';
        return date.toISOString().split('T')[1].slice(0, 8);
      };

      return {
        date: clockIn.toISOString().split('T')[0],
        timeIn: formatUTCTime(clockIn),
        timeOut: formatUTCTime(clockOut),
        lunchStart: entry.break_start ? formatUTCTime(new Date(entry.break_start)) : '',
        lunchEnd: entry.break_end ? formatUTCTime(new Date(entry.break_end)) : '',
        totalHours,
        lunchBreak: breakMinutes / 60,
        workedHours,
        jobLocation: entry.job_locations?.name || '',
        status: entry.status || 'pending'
      };
    });
  }

  /**
   * Export weekly summary to CSV format
   */
  async exportWeeklySummaryToCSV(filters: ReportFilters): Promise<string> {
    const data = await this.getWeeklyHours(filters);
    
    const headers = [
      'Employee',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Regular Hours',
      'Overtime',
      'Vacation Hours',
      'Sick Leave Hours',
      'Vacation Balance',
      'Sick Leave Balance'
    ];

    const rows = data.map(employee => [
      employee.name,
      employee.hours.monday,
      employee.hours.tuesday,
      employee.hours.wednesday,
      employee.hours.thursday,
      employee.hours.friday,
      employee.hours.saturday,
      employee.hours.sunday,
      employee.totalRegular,
      employee.totalOT,
      employee.vacationHours,
      employee.sickLeaveHours,
      employee.vacationBalance,
      employee.sickLeaveBalance
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Export employee time entries to CSV format
   */
  async exportTimeEntriesToCSV(employeeId: string, filters: ReportFilters): Promise<string> {
    const data = await this.getEmployeeDetails(employeeId, filters);
    
    const headers = [
      'Date',
      'Time In',
      'Lunch Break Start',
      'Lunch Break End',
      'Time Out',
      'Total Hours',
      'Lunch Break',
      'Worked Hours',
      'Job Location',
      'Status'
    ];

    const rows = data.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.timeIn,
      entry.lunchStart,
      entry.lunchEnd,
      entry.timeOut,
      entry.totalHours.toFixed(2),
      entry.lunchBreak.toFixed(2),
      entry.workedHours.toFixed(2),
      entry.jobLocation,
      entry.status
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Debug weekly hours calculation for a specific employee
   */
  async debugWeeklyHours(employeeId: string, filters: ReportFilters): Promise<any> {
    // First get the user's current organization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .single();

    if (memberError) {
      console.error('Error fetching organization member:', memberError);
      throw new Error('Failed to fetch organization data');
    }

    // Call the debug function
    const { data, error } = await supabase
      .rpc('debug_weekly_hours', {
        start_date: filters.startDate.toISOString(),
        end_date: filters.endDate.toISOString(),
        org_id: member.organization_id,
        employee_id: employeeId
      });

    if (error) {
      console.error('Error debugging weekly hours:', error);
      throw new Error('Failed to debug weekly hours data');
    }

    return data;
  }
}