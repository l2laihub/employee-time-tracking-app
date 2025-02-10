import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTimeEntry } from '../contexts/TimeEntryContext';
import type { JobLocation } from '../lib/types';
import { createTimeEntry, updateTimeEntry, clockOut, startBreak, endBreak, getActiveTimeEntry } from '../services/timeEntries';
import { listLocations } from '../services/jobLocations';
import { getEmployeeByUserId, createEmployeeForCurrentUser } from '../services/employees'; 
import JobSelector from '../components/time-entry/JobSelector';
import TimeControls from '../components/time-entry/TimeControls';
import StatusBadge from '../components/time-entry/StatusBadge';
import TimeEntryList from '../components/time-entry/TimeEntryList';
import NotesField from '../components/time-entry/NotesField';

export default function TimeEntry() {
  const { user } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { activeEntry, setActiveEntry, isLoading: timeEntryLoading } = useTimeEntry();

  useEffect(() => {
    async function fetchJobs() {
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
      
      if (result.success) {
        setJobs(result.data as JobLocation[]);
      } else {
        setError(result.error);
      }
      setIsLoadingJobs(false);
    }

    fetchJobs();
  }, [organization?.id, user?.id, orgLoading]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadActiveEntry() {
      const result = await getActiveTimeEntry(user.id);
      if (result.success && result.data) {
        setActiveEntry(result.data);
        setSelectedJobId(result.data.job_location_id);
        setNotes(result.data.work_description || '');
      }
    }

    loadActiveEntry();
  }, [user?.id]);

  const handleClockIn = async () => {
    if (!selectedJobId || !user?.id || !organization?.id) return;

    try {
      // Get employee ID for the current user
      let employeeResult = await getEmployeeByUserId(user.id);
      
      // If employee doesn't exist, create one
      if (!employeeResult.success || !employeeResult.data) {
        console.log('No employee record found, creating one...');
        employeeResult = await createEmployeeForCurrentUser(organization.id);
        
        if (!employeeResult.success || !employeeResult.data) {
          setError('Could not create employee record. Please contact your administrator.');
          return;
        }
      }

      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (!selectedJob) {
        setError('Selected job not found');
        return;
      }

      const result = await createTimeEntry(
        user.id,
        selectedJobId,
        selectedJob.service_type,
        notes || 'No description provided',
        organization.id
      );

      if (result.success) {
        setActiveEntry(result.data);
        setError(undefined);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Clock in error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while clocking in');
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    try {
      const result = await clockOut(activeEntry.id);

      if (result.success) {
        setActiveEntry(null);
        setSelectedJobId(null);
        setNotes(''); // Clear notes on clock out
        setError(undefined);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Clock out error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while clocking out');
    }
  };

  const handleStartBreak = async () => {
    if (!activeEntry) return;

    try {
      const result = await startBreak(activeEntry.id);

      if (result.success) {
        setActiveEntry(result.data);
        setError(undefined);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Start break error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while starting break');
    }
  };

  const handleEndBreak = async () => {
    if (!activeEntry) return;

    try {
      const result = await endBreak(activeEntry.id);

      if (result.success) {
        setActiveEntry(result.data);
        setError(undefined);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('End break error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while ending break');
    }
  };

  const handleUpdateNotes = async (newNotes: string) => {
    setNotes(newNotes);
    if (activeEntry) {
      const result = await updateTimeEntry(activeEntry.id, {
        work_description: newNotes
      });

      if (result.success) {
        setActiveEntry(result.data);
        setError(undefined);
      } else {
        setError(result.error);
      }
    }
  };

  const getStatus = () => {
    if (!activeEntry) return 'inactive';
    return activeEntry.status;
  };

  // Clear notes when job changes
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

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Time Entry</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 my-4 sm:my-8">Time Entry</h1>

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
              <StatusBadge status={getStatus()} />
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
              onChange={handleUpdateNotes}
              disabled={!activeEntry && !selectedJobId}
            />
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
