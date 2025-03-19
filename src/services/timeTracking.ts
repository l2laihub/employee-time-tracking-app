import { OrganizationClient } from '../lib/supabase';
import type { Database } from '../types/database.types';
import type { JobLocation } from '../lib/types';

type TimeEntry = Database['public']['Tables']['time_entries']['Row'];
type JobLocationCreate = Omit<Database['public']['Tables']['job_locations']['Row'], 'id' | 'created_at' | 'updated_at'>;

export class TimeTrackingService {
  private client: OrganizationClient;

  constructor(client: OrganizationClient) {
    this.client = client;
  }

  // Job Locations
  async createJobLocation(data: JobLocationCreate) {
    console.log('TimeTrackingService.createJobLocation:', {
      organizationId: this.client.organizationId,
      data
    });
    
    const result = await this.client.insert('job_locations', data);
    console.log('TimeTrackingService.createJobLocation result:', result);
    return result;
  }

  async updateJobLocation(id: string, data: Partial<JobLocation>) {
    return this.client.update('job_locations', id, data);
  }

  async deleteJobLocation(id: string) {
    return this.client.delete('job_locations', id);
  }

  async getJobLocations() {
    console.log('TimeTrackingService.getJobLocations for organization:', this.client.organizationId);
    const result = await this.client
      .from('job_locations')
      .select('*')
      .eq('organization_id', this.client.organizationId)
      .order('name', { ascending: true });
    
    console.log('TimeTrackingService.getJobLocations result:', result);
    return result;
  }

  async getJobLocationById(id: string) {
    return this.client
      .from('job_locations')
      .select('*')
      .eq('id', id)
      .single();
  }

  subscribeToJobLocations(callback: (payload: any) => void) {
    console.log('TimeTrackingService.subscribeToJobLocations for organization:', this.client.organizationId);
    return this.client.subscribe('job_locations', callback);
  }

  // Time Entries
  async createTimeEntry(data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) {
    return this.client.insert('time_entries', data);
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>) {
    return this.client.update('time_entries', id, data);
  }

  async deleteTimeEntry(id: string) {
    return this.client.delete('time_entries', id);
  }

  async getTimeEntries(options?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    jobLocationId?: string;
  }) {
    let query = this.client
      .from('time_entries')
      .select(`
        *,
        job_locations (
          id,
          name,
          type,
          service_type
        )
      `)
      .order('start_time', { ascending: false });

    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options?.startDate) {
      query = query.gte('start_time', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('start_time', options.endDate);
    }

    if (options?.jobLocationId) {
      query = query.eq('job_location_id', options.jobLocationId);
    }

    return query;
  }

  async getTimeEntryById(id: string) {
    return this.client
      .from('time_entries')
      .select(`
        *,
        job_locations (
          id,
          name,
          type,
          service_type
        )
      `)
      .eq('id', id)
      .single();
  }

  // Real-time subscriptions
  subscribeToTimeEntries(userId: string, callback: (payload: any) => void) {
    return this.client.subscribe('time_entries', callback);
  }
}
