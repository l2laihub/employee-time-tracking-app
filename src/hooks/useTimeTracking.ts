import { useCallback, useEffect, useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { TimeTrackingService } from '../services/timeTracking';
import { OrganizationClient } from '../lib/supabase';
import type { Database } from '../types/database.types';
import type { JobLocation, JobLocationFormData } from '../lib/types';

type JobLocation = Database['public']['Tables']['job_locations']['Row'];
type TimeEntry = Database['public']['Tables']['time_entries']['Row'];

export function useTimeTracking() {
  const { organization } = useOrganization();
  
  if (!organization) {
    throw new Error('useTimeTracking must be used within an OrganizationProvider');
  }

  // Initialize service immediately using useMemo
  const service = useMemo(() => {
    console.log('Initializing TimeTrackingService with organization:', organization.id);
    const client = new OrganizationClient(organization.id);
    return new TimeTrackingService(client);
  }, [organization.id]);

  // Job Locations
  const createJobLocation = useCallback(
    async (data: Omit<JobLocation, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating job location for organization:', organization.id, data);
      return service.createJobLocation(data);
    },
    [service, organization.id]
  );

  const updateJobLocation = useCallback(
    async (id: string, data: Partial<JobLocation>) => {
      return service.updateJobLocation(id, data);
    },
    [service]
  );

  const deleteJobLocation = useCallback(
    async (id: string) => {
      return service.deleteJobLocation(id);
    },
    [service]
  );

  const getJobLocations = useCallback(async () => {
    console.log('Getting job locations for organization:', organization.id);
    return service.getJobLocations();
  }, [service, organization.id]);

  const getJobLocationById = useCallback(
    async (id: string) => {
      return service.getJobLocationById(id);
    },
    [service]
  );

  // Time Entries
  const createTimeEntry = useCallback(
    async (data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => {
      return service.createTimeEntry(data);
    },
    [service]
  );

  const updateTimeEntry = useCallback(
    async (id: string, data: Partial<TimeEntry>) => {
      return service.updateTimeEntry(id, data);
    },
    [service]
  );

  const deleteTimeEntry = useCallback(
    async (id: string) => {
      return service.deleteTimeEntry(id);
    },
    [service]
  );

  const getTimeEntries = useCallback(
    async (options?: {
      userId?: string;
      startDate?: string;
      endDate?: string;
      jobLocationId?: string;
    }) => {
      return service.getTimeEntries(options);
    },
    [service]
  );

  const getTimeEntryById = useCallback(
    async (id: string) => {
      return service.getTimeEntryById(id);
    },
    [service]
  );

  // Real-time subscriptions
  const subscribeToTimeEntries = useCallback(
    (userId: string, callback: (payload: any) => void) => {
      return service.subscribeToTimeEntries(userId, callback);
    },
    [service]
  );

  const subscribeToJobLocations = useCallback((callback: (payload: any) => void) => {
    console.log('Setting up job locations subscription for organization:', organization.id);
    return service.subscribeToJobLocations(callback);
  }, [service, organization.id]);

  return {
    createJobLocation,
    updateJobLocation,
    deleteJobLocation,
    getJobLocations,
    getJobLocationById,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTimeEntries,
    getTimeEntryById,
    subscribeToTimeEntries,
    subscribeToJobLocations,
  };
}
