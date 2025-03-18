import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTimeEntry } from '../contexts/TimeEntryContext';
import { TimeEntry as TimeEntryType, TimeEntryStatus, JobLocation } from '../types/custom.types';
import { createTimeEntry, clockOut, startBreak, endBreak, updateTimeEntry } from '../services/timeEntries';
import { listLocations } from '../services/jobLocations';
import StatusBadge from '../components/time-entry/StatusBadge';
import JobSelector from '../components/time-entry/JobSelector';
import TimeControls from '../components/time-entry/TimeControls';
import NotesField from '../components/time-entry/NotesField';
import TimeEntryList from '../components/time-entry/TimeEntryList';

export default function TimeEntry() {
  const { user } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { activeEntry, setActiveEntry, isLoading: timeEntryLoading } = useTimeEntry();

  useEffect(() => {
    async function fetchJobs() {
      if (!user || !organization) return;

      console.log('TimeEntry: fetchJobs called', {
        organizationId: organization?.id,
        userId: user?.id,
        orgLoading
      });

      if (orgLoading) {
        console.log('TimeEntry: Organization still loading');
        return;
      }

      if (!organization?.id) {
        console.log('TimeEntry: No organization ID, skipping fetch');
        setIsLoadingJobs(false);
        return;
      }

      const result = await listLocations(organization.id);
      console.log('TimeEntry: listLocations result', result);
      
      if (result.success && result.data) {
        const jobLocations = Array.isArray(result.data) ? result.data : [result.data];
        setJobs(jobLocations as JobLocation[]);
        
        // Log the service types for debugging
        console.log('TimeEntry: Job locations with service types:', 
          jobLocations.map((job: JobLocation) => ({
            id: job.id,
            name: job.name,
            service_type: job.service_type
          }))
        );
      } else {
        setError(result.error);
      }
      setIsLoadingJobs(false);
    }

    fetchJobs();
  }, [organization, user, orgLoading]);

  // Function to get active time entry
  const getActiveTimeEntry = async (userId: string) => {
    // This is a placeholder implementation
    // In a real app, this would call an API endpoint
    console.log('Getting active time entry for user:', userId);
    
    // Return a mock result for now
    return {
      success: false,
      data: null,
      error: 'Function not implemented'
    };
  };

  useEffect(() => {
    async function loadActiveEntry() {
      if (!user?.id) return;
      
      try {
        const result = await getActiveTimeEntry(user.id);
        if (result.success && result.data) {
          const entry = result.data as TimeEntryType;
          setActiveEntry(entry);
          setSelectedJobId(entry.job_location_id);
          setNotes(entry.work_description || '');
        }
      } catch (err) {
        console.error('Error loading active time entry:', err);
        setError('Failed to load active time entry');
      }
    }

    loadActiveEntry();
  }, [user, setActiveEntry]);

  const handleClockIn = async () => {
    try {
      setError(undefined);
      setSuccess(undefined);
      
      if (!selectedJobId) {
        setError('Please select a job location');
        return;
      }

      if (!user || !organization) {
        setError('User or organization information is missing');
        return;
      }

      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (!selectedJob) {
        setError('Selected job not found');
        return;
      }

      // Debug log the selected job
      console.log('TimeEntry: Selected job for clock in:', {
        id: selectedJob.id,
        name: selectedJob.name,
        service_type: selectedJob.service_type,
        typeofServiceType: typeof selectedJob.service_type
      });

      // Extract service type ID properly regardless of whether it's a string, object, or null
      let serviceTypeId: string | null = null;
      
      if (typeof selectedJob.service_type === 'object' && selectedJob.service_type !== null) {
        serviceTypeId = selectedJob.service_type.id;
        console.log('TimeEntry: Using service type ID from object:', serviceTypeId);
      } else if (typeof selectedJob.service_type === 'string') {
        serviceTypeId = selectedJob.service_type;
        console.log('TimeEntry: Using service type ID from string:', serviceTypeId);
      } else if (selectedJob.service_type === null) {
        console.log('TimeEntry: Job has null service type, proceeding without service type');
        // Service type is null, which is allowed
        serviceTypeId = null;
      } else {
        console.error('TimeEntry: Invalid service type:', selectedJob.service_type);
        setError('Invalid service type format for selected job');
        return;
      }

      console.log('TimeEntry: Creating time entry with service type:', serviceTypeId);
      
      const result = await createTimeEntry({
        user_id: user.id,
        organization_id: organization.id,
        job_location_id: selectedJobId,
        service_type: serviceTypeId,
        work_description: notes || ''
      });

      console.log('TimeEntry: Create time entry result:', result);

      if (result.success) {
        setActiveEntry(result.data as TimeEntryType);
        setError(undefined);
        setSuccess('Successfully clocked in');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Clock in error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while clocking in');
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry || !user) return;

    try {
      setError(undefined);
      setSuccess(undefined);
      
      const result = await clockOut(activeEntry.id, notes);
      if (result.success) {
        setActiveEntry(undefined);
        setError(undefined);
        setSuccess('Successfully clocked out');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Clock out error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while clocking out');
    }
  };

  const handleStartBreak = async () => {
    if (!activeEntry || !user) return;

    try {
      setError(undefined);
      setSuccess(undefined);
      
      const result = await startBreak(activeEntry.id);
      if (result.success) {
        setActiveEntry(result.data as TimeEntryType);
        setError(undefined);
        setSuccess('Break started');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Start break error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while starting break');
    }
  };

  const handleEndBreak = async () => {
    if (!activeEntry || !user) return;

    try {
      setError(undefined);
      setSuccess(undefined);
      
      const result = await endBreak(activeEntry.id);
      if (result.success) {
        setActiveEntry(result.data as TimeEntryType);
        setError(undefined);
        setSuccess('Break ended');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('End break error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while ending break');
    }
  };

  const handleUpdateNotes = async () => {
    if (!activeEntry || !user) return;

    try {
      setError(undefined);
      setSuccess(undefined);
      
      const result = await updateTimeEntry(activeEntry.id, { work_description: notes });
      if (result.success) {
        setError(undefined);
        setSuccess('Notes saved');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Update notes error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating notes');
    }
  };

  useEffect(() => {
    setNotes('');
  }, [selectedJobId]);

  if (isLoadingJobs || timeEntryLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Time Entry</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 my-4 sm:my-8">Time Entry</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-green-700 mb-4">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="space-y-6">
          <div>
            <JobSelector
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelect={setSelectedJobId}
              disabled={!!activeEntry}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-full sm:w-auto">
              <StatusBadge status={activeEntry ? activeEntry.status as TimeEntryStatus : 'inactive'} />
            </div>
            <div className="w-full">
              <TimeControls
                isActive={!!activeEntry}
                isOnBreak={activeEntry?.status === 'break'}
                onClockIn={handleClockIn}
                onClockOut={handleClockOut}
                onStartBreak={handleStartBreak}
                onEndBreak={handleEndBreak}
              />
            </div>
          </div>
          
          <div>
            <NotesField 
              value={activeEntry?.work_description || notes}
              onChange={setNotes}
              disabled={!activeEntry && !selectedJobId}
            />
            {(activeEntry || selectedJobId) && (
              <button
                onClick={handleUpdateNotes}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!activeEntry}
              >
                Save Notes
              </button>
            )}
          </div>
        </div>
      </div>

      <TimeEntryList 
        locations={jobs}
        key={activeEntry?.id || 'no-entry'} 
      />
    </div>
  );
}
