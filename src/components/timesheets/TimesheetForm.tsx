import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { TimeEntry, JobLocation } from '../../lib/types';
import type { Timesheet } from '../../types/custom.types';
import TimeEntryList from '../time-entry/TimeEntryList';
import JobSelector from '../time-entry/JobSelector';
import TimeControls from '../time-entry/TimeControls';
import NotesField from '../time-entry/NotesField';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useTimeEntry } from '../../contexts/TimeEntryContext';
import { createTimeEntry, updateTimeEntry, listTimeEntriesByTimesheet } from '../../services/timeEntries';
import { listLocations } from '../../services/jobLocations';

interface TimesheetFormProps {
  timesheet: Timesheet;
  onSubmit: (timesheet: Timesheet) => void;
  onCancel: () => void;
}

export default function TimesheetForm({ timesheet, onSubmit, onCancel }: TimesheetFormProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { activeEntry } = useTimeEntry();
  const [notes, setNotes] = useState(timesheet.review_notes || '');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [jobs, setJobs] = useState<JobLocation[]>([]);

  useEffect(() => {
    loadTimeEntries();
    loadJobs();
  }, [timesheet.id, organization?.id]);

  const loadTimeEntries = async () => {
    if (!timesheet.id) return;
    
    setIsLoading(true);
    const result = await listTimeEntriesByTimesheet(timesheet.id);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const loadJobs = async () => {
    if (!organization?.id) return;

    try {
      const result = await listLocations(organization.id);
      if (result.success && Array.isArray(result.data)) {
        // Only show active job locations
        const activeJobs = (result.data as JobLocation[]).filter(job => job.is_active);
        setJobs(activeJobs);
      } else {
        setError(result.error || 'Failed to load job locations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job locations');
    }
  };

  const handleClockIn = async () => {
    if (!organization?.id || !selectedJobId || !user?.id) {
      setError('Please select a job location first');
      return;
    }

    const result = await createTimeEntry(
      user.id,
      selectedJobId,
      'both', // Default service type
      notes,
      organization.id
    );

    if (!result.success) {
      setError(result.error);
    } else {
      loadTimeEntries(); // Refresh the list
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    const result = await updateTimeEntry(activeEntry.id, {
      status: 'completed',
      clock_out: new Date()
    });

    if (!result.success) {
      setError(result.error);
    } else {
      loadTimeEntries(); // Refresh the list
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update timesheet with final notes and submit
    onSubmit({
      ...timesheet,
      review_notes: notes,
      status: 'submitted'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Time Entry</h2>
        
        <div className="space-y-4">
          <JobSelector
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
          />
          
          <NotesField
            value={notes}
            onChange={setNotes}
            placeholder="Add work description..."
          />

          <TimeControls
            isActive={!!activeEntry}
            isOnBreak={activeEntry?.status === 'break'}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onStartBreak={() => {}}
            onEndBreak={() => {}}
          />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Time Entries</h2>
        
        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}

        <TimeEntryList
          locations={jobs}
          entriesPerPage={5}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Submit Timesheet
        </button>
      </div>
    </div>
  );
}
