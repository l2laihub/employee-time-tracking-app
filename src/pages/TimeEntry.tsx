import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTimeEntry } from '../contexts/TimeEntryContext';
import type { JobLocation } from '../lib/types';
import { createTimeEntry, updateTimeEntry } from '../services/timeEntries';
import { listLocations } from '../services/jobLocations';
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

  const handleClockIn = async () => {
    if (!selectedJobId || !user?.id || !organization?.id) return;

    const selectedJob = jobs.find(job => job.id === selectedJobId);
    const serviceType = selectedJob?.service_type === 'both' ? 'hvac' : (selectedJob?.service_type || 'hvac');

    const result = await createTimeEntry(
      user.id,
      selectedJobId,
      new Date().toISOString(),
      serviceType,
      notes,
      organization.id
    );

    if (result.success) {
      setActiveEntry(result.data);
      setError(undefined);
    } else {
      setError(result.error);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    const result = await updateTimeEntry(activeEntry.id, {
      end_time: new Date().toISOString(),
      status: 'completed'
    });

    if (result.success) {
      setActiveEntry(undefined);
      setSelectedJobId(null);
      setNotes(''); // Clear notes on clock out
      setError(undefined);
    } else {
      setError(result.error);
    }
  };

  const handleStartBreak = async () => {
    if (!activeEntry) return;

    const result = await updateTimeEntry(activeEntry.id, {
      status: 'break'
    });

    if (result.success) {
      setActiveEntry(result.data);
      setError(undefined);
    } else {
      setError(result.error);
    }
  };

  const handleEndBreak = async () => {
    if (!activeEntry) return;

    const result = await updateTimeEntry(activeEntry.id, {
      status: 'working'
    });

    if (result.success) {
      setActiveEntry(result.data);
      setError(undefined);
    } else {
      setError(result.error);
    }
  };

  const handleUpdateNotes = async (newNotes: string) => {
    setNotes(newNotes);
    if (activeEntry) {
      const result = await updateTimeEntry(activeEntry.id, {
        notes: newNotes
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

  if (orgLoading || timeEntryLoading || isLoadingJobs) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 my-4 sm:my-8">Time Entry</h1>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
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
              value={activeEntry?.notes || notes}
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
