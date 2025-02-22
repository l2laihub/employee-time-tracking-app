import { supabase } from './supabase';
import type { Database } from '../types/database.types';
import { listTimeEntries } from '../services/timeEntries';
import type { TimeEntry } from '../types/custom.types';

interface OrganizationMetricsRecord {
  id: string;
  organization_id: string;
  active_users: number;
  time_entries: number;
  storage_used: number;
  api_calls: number;
  timestamp: string;
}

interface TimeEntryWithUser {
  id: string;
  user_id: string;
  job_location_id: string | null;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  service_type: string;
  work_description: string;
  status: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  user: {
    email: string;
  } | null;
  job_locations?: {
    name: string;
    type: string;
    service_type: string;
  } | null;
}

export interface OrganizationMetrics {
  activeUsers: number;
  totalHours: number;
  averageHoursPerUser: number;
  timeEntriesCount: number;
  jobLocationDistribution: { name: string; hours: number }[];
  userActivityDistribution: { email: string; hours: number }[];
  weeklyHours: { week: string; hours: number }[];
}

/**
 * Updates the organization metrics in the database
 */
export async function updateOrganizationMetrics(organizationId: string): Promise<void> {
  try {
    // Get active users count
    const { count: activeUsers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get time entries count for all time
    const { count: timeEntriesCount } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Insert new metrics record
    const { error: insertError } = await supabase
      .from('organization_metrics')
      .insert({
        organization_id: organizationId,
        active_users: activeUsers || 0,
        time_entries: timeEntriesCount || 0,
        storage_used: 0, // TODO: Implement storage calculation
        api_calls: 0, // TODO: Implement API calls tracking
        timestamp: new Date().toISOString()
      });

    if (insertError) throw insertError;
  } catch (error) {
    console.error('Error updating organization metrics:', error);
    throw error;
  }
}

/**
 * Gets organization metrics combining stored and real-time data
 */
export async function getOrganizationMetrics(organizationId: string, startDate?: Date, endDate?: Date): Promise<OrganizationMetrics> {
  const timeRange = {
    gte: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to last 30 days
    lte: endDate?.toISOString() || new Date().toISOString(),
  };

  try {
    // Try to get stored metrics first
    const { data: storedMetrics } = await supabase
      .from('organization_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // If no stored metrics exist or they're older than 1 hour, trigger an update
    if (!storedMetrics || new Date().getTime() - new Date(storedMetrics.timestamp).getTime() > 3600000) {
      await updateOrganizationMetrics(organizationId);
    }

    // Get active users count
    const { count: activeUsers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get time entries using the existing service
    const timeEntriesResult = await listTimeEntries(organizationId, {
      startDate: new Date(timeRange.gte),
      endDate: new Date(timeRange.lte)
    });

    if (!timeEntriesResult.success || !timeEntriesResult.data) {
      throw new Error(timeEntriesResult.error || 'Failed to fetch time entries');
    }

    // Ensure we have an array of time entries
    const timeEntries = Array.isArray(timeEntriesResult.data)
      ? timeEntriesResult.data
      : [timeEntriesResult.data];

    const timeEntriesWithUsers = timeEntries.map(entry => ({
      ...entry,
      user: {
        email: entry.user_id // We'll get the email from employees table later if needed
      }
    })) as TimeEntryWithUser[];

    // No need to fetch job locations separately as they're included in the time entries response

    // Calculate total hours - only for completed entries
    const totalHours = timeEntriesWithUsers.reduce((total, entry) => {
      if (entry.status !== 'completed' || !entry.clock_out) return total;
      
      const duration = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
      if (duration < 0) return total; // Skip invalid durations
      
      const breakMinutes = entry.total_break_minutes || 0;
      const hours = Math.max(0, (duration / (1000 * 60 * 60)) - (breakMinutes / 60));
      return total + hours;
    }, 0);

    // Calculate job location distribution - only for completed entries with valid durations
    const locationMap = new Map<string, number>();
    timeEntriesWithUsers.forEach(entry => {
      if (entry.status !== 'completed' || !entry.clock_out) return;

      const duration = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
      if (duration < 0) return; // Skip invalid durations

      const locationName = entry.job_locations?.name || 'Unknown';
      const breakMinutes = entry.total_break_minutes || 0;
      const hours = Math.max(0, (duration / (1000 * 60 * 60)) - (breakMinutes / 60));
      locationMap.set(locationName, (locationMap.get(locationName) || 0) + hours);
    });

    // Calculate user activity distribution - only for completed entries
    const userMap = new Map<string, number>();
    timeEntriesWithUsers.forEach(entry => {
      if (entry.status !== 'completed' || !entry.clock_out) return;

      const duration = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
      if (duration < 0) return; // Skip invalid durations

      const userEmail = entry.user?.email || 'Unknown';
      const breakMinutes = entry.total_break_minutes || 0;
      const hours = Math.max(0, (duration / (1000 * 60 * 60)) - (breakMinutes / 60));
      userMap.set(userEmail, (userMap.get(userEmail) || 0) + hours);
    });

    // Calculate weekly hours - only for completed entries
    const weekMap = new Map<string, number>();
    timeEntriesWithUsers.forEach(entry => {
      if (entry.status !== 'completed' || !entry.clock_out) return;

      const duration = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
      if (duration < 0) return; // Skip invalid durations

      const week = getWeekString(new Date(entry.clock_in));
      const breakMinutes = entry.total_break_minutes || 0;
      const hours = Math.max(0, (duration / (1000 * 60 * 60)) - (breakMinutes / 60));
      weekMap.set(week, (weekMap.get(week) || 0) + hours);
    });

    return {
      activeUsers: activeUsers || 0,
      totalHours,
      averageHoursPerUser: totalHours / (activeUsers || 1),
      timeEntriesCount: timeEntries.length,
      jobLocationDistribution: Array.from(locationMap.entries()).map(([name, hours]) => ({ name, hours })),
      userActivityDistribution: Array.from(userMap.entries()).map(([email, hours]) => ({ email, hours })),
      weeklyHours: Array.from(weekMap.entries())
        .map(([week, hours]) => ({ week, hours }))
        .sort((a, b) => a.week.localeCompare(b.week)),
    };
  } catch (error) {
    console.error('Error fetching organization metrics:', error);
    throw error;
  }
}

function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Schedule regular updates of organization metrics
 * This should be called when the application starts
 */
export function scheduleMetricsUpdates(organizationId: string): void {
  // Update metrics immediately
  updateOrganizationMetrics(organizationId).catch(error => {
    console.error('Error in initial metrics update:', error);
  });

  // Schedule updates every hour
  setInterval(() => {
    updateOrganizationMetrics(organizationId).catch(error => {
      console.error('Error in scheduled metrics update:', error);
    });
  }, 3600000); // 1 hour in milliseconds
}
