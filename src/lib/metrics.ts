import { supabase } from './supabase';
import type { Database } from '../types/database.types';

type TimeEntry = Database['public']['Tables']['time_entries']['Row'];

export interface OrganizationMetrics {
  activeUsers: number;
  totalHours: number;
  averageHoursPerUser: number;
  timeEntriesCount: number;
  jobLocationDistribution: { name: string; hours: number }[];
  userActivityDistribution: { email: string; hours: number }[];
  weeklyHours: { week: string; hours: number }[];
}

export async function getOrganizationMetrics(organizationId: string, startDate?: Date, endDate?: Date): Promise<OrganizationMetrics> {
  const timeRange = {
    gte: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to last 30 days
    lte: endDate?.toISOString() || new Date().toISOString(),
  };

  try {
    // Get active users count
    const { count: activeUsers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get time entries
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('start_time', timeRange.gte)
      .lte('end_time', timeRange.lte);

    if (timeEntriesError) throw timeEntriesError;

    // Get user emails for the time entries
    const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds);

    // Get job locations for the time entries
    const locationIds = [...new Set(timeEntries.map(entry => entry.job_location_id).filter(Boolean))];
    const { data: locations } = await supabase
      .from('job_location')
      .select('id, name')
      .in('id', locationIds);

    const userEmailMap = new Map(users?.map(user => [user.id, user.email]) || []);
    const locationNameMap = new Map(locations?.map(loc => [loc.id, loc.name]) || []);

    // Calculate total hours
    const totalHours = timeEntries.reduce((total, entry) => {
      const duration = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
      return total + (duration / (1000 * 60 * 60)); // Convert ms to hours
    }, 0);

    // Calculate job location distribution
    const locationMap = new Map<string, number>();
    timeEntries.forEach(entry => {
      const locationName = entry.job_location_id ? locationNameMap.get(entry.job_location_id) || 'Unknown' : 'No Location';
      const duration = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
      const hours = duration / (1000 * 60 * 60);
      locationMap.set(locationName, (locationMap.get(locationName) || 0) + hours);
    });

    // Calculate user activity distribution
    const userMap = new Map<string, number>();
    timeEntries.forEach(entry => {
      const userEmail = userEmailMap.get(entry.user_id) || 'Unknown';
      const duration = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
      const hours = duration / (1000 * 60 * 60);
      userMap.set(userEmail, (userMap.get(userEmail) || 0) + hours);
    });

    // Calculate weekly hours
    const weekMap = new Map<string, number>();
    timeEntries.forEach(entry => {
      const week = getWeekString(new Date(entry.start_time));
      const duration = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
      const hours = duration / (1000 * 60 * 60);
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
