import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Timesheet, TimeEntry, JobLocation } from '../../types/custom.types';
import { getTimesheetDetails, updateTimeEntry } from '../../services/timesheets';
import { supabase } from '../../lib/supabase';

interface TimesheetReviewFormProps {
  timesheet: Timesheet;
  onSubmit: (status: string, notes?: string) => void;
  onClose: () => void;
}

export default function TimesheetReviewForm({ 
  timesheet: initialTimesheet, 
  onSubmit, 
  onClose
}: TimesheetReviewFormProps) {
  const [timesheet, setTimesheet] = useState<Timesheet>(initialTimesheet);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [employeeNotes, setEmployeeNotes] = useState('');
  const [jobLocations, setJobLocations] = useState<JobLocation[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Use refs to prevent unnecessary re-renders
  const timesheetRef = useRef(timesheet);
  const timeEntriesRef = useRef(timeEntries);
  const jobLocationsRef = useRef(jobLocations);

  useEffect(() => {
    timesheetRef.current = timesheet;
    timeEntriesRef.current = timeEntries;
    jobLocationsRef.current = jobLocations;
  }, [timesheet, timeEntries, jobLocations]);

  const loadDetails = useCallback(async () => {
    const details = await getTimesheetDetails(initialTimesheet.id);
    if (details.timesheet) {
      setTimesheet(details.timesheet);
    }
    setTimeEntries(details.timeEntries);
    setLoading(false);
  }, [initialTimesheet.id]);

  const loadJobLocations = useCallback(async () => {
    try {
      const { data: locations, error } = await supabase
        .from('job_locations')
        .select('id, organization_id, name, address')
        .eq('organization_id', initialTimesheet.organization_id);
      
      if (error) throw error;
      setJobLocations(locations || []);
    } catch (error) {
      console.error('Error loading job locations:', error);
    }
  }, [initialTimesheet.organization_id]);

  useEffect(() => {
    loadDetails();
    loadJobLocations();
  }, [loadDetails, loadJobLocations]);

  const handleEditEntry = useCallback((entry: TimeEntry) => {
    // Ensure datetime-local input gets the correct format and job_location_id is properly set
    const formattedEntry = {
      ...entry,
      clock_in: entry.clock_in?.slice(0, 16) || '', // Format: YYYY-MM-DDThh:mm
      clock_out: entry.clock_out?.slice(0, 16) || '',
      job_location_id: entry.job_location?.id || entry.job_location_id // Use existing job_location.id if available
    };
    console.log('Editing entry with data:', formattedEntry);
    setEditingEntry(formattedEntry);
  }, []);

  const handleSaveEntry = useCallback(async (entry: TimeEntry) => {
    try {
      // Ensure we send the full ISO string and properly format the job_location_id
      const updatedEntry = {
        ...entry,
        clock_in: new Date(entry.clock_in).toISOString(),
        clock_out: new Date(entry.clock_out).toISOString(),
        job_location_id: entry.job_location_id, // Make sure this is sent as is
        total_break_minutes: Number(entry.total_break_minutes) // Ensure this is a number
      };
      
      console.log('Saving entry with data:', updatedEntry);
      await updateTimeEntry(updatedEntry);
      
      // Reload timesheet details to get updated data
      await loadDetails();
      setEditingEntry(null);
    } catch (error) {
      console.error('Error updating time entry:', error);
      // TODO: Show error message to user
    }
  }, [loadDetails]);

  const handleCancelEdit = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(status, reviewNotes);
  }, [status, reviewNotes, onSubmit]);

  const calculateEntryHours = useCallback((entry: TimeEntry) => {
    if (!entry.clock_in || !entry.clock_out) return 0;
    const start = new Date(entry.clock_in);
    const end = new Date(entry.clock_out);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const breakHours = (entry.total_break_minutes || 0) / 60;
    return Number((hours - breakHours).toFixed(2));
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-pulse">Loading timesheet details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Review Timesheet - {timesheet.employee?.first_name} {timesheet.employee?.last_name} - Week of {format(new Date(timesheet.period_start_date), 'MMM dd, yyyy')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Total Hours: {timesheet.total_hours?.toFixed(2) || '0.00'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Time Entries */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Time Entries</h4>
            <div className="space-y-4">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  {editingEntry?.id === entry.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Clock In</label>
                          <input
                            type="datetime-local"
                            value={editingEntry.clock_in}
                            onChange={(e) => setEditingEntry({ ...editingEntry, clock_in: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Clock Out</label>
                          <input
                            type="datetime-local"
                            value={editingEntry.clock_out}
                            onChange={(e) => setEditingEntry({ ...editingEntry, clock_out: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Break Duration (minutes)</label>
                          <input
                            type="number"
                            value={editingEntry.total_break_minutes}
                            onChange={(e) => setEditingEntry({ ...editingEntry, total_break_minutes: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Job Location</label>
                          <select
                            value={editingEntry.job_location_id}
                            onChange={(e) => setEditingEntry({ ...editingEntry, job_location_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            {jobLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Work Description</label>
                        <textarea
                          value={editingEntry.work_description}
                          onChange={(e) => setEditingEntry({ ...editingEntry, work_description: e.target.value })}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Hours: {calculateEntryHours(editingEntry)}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEntry(editingEntry)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(entry.clock_in), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Hours: {calculateEntryHours(entry)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>Clock In: {format(new Date(entry.clock_in), 'h:mm a')}</div>
                        <div>Clock Out: {format(new Date(entry.clock_out), 'h:mm a')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>Break Duration: {entry.total_break_minutes} minutes</div>
                        <div>Location: {entry.job_location?.name}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Description: {entry.work_description}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleEditEntry(entry)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Employee Notes */}
          <div>
            <label htmlFor="employee-notes" className="block text-sm font-medium text-gray-700">
              Employee Notes
            </label>
            <div className="mt-1">
              <textarea
                id="employee-notes"
                rows={2}
                value={employeeNotes}
                readOnly
                className="shadow-sm block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                placeholder="Regular work week"
              />
            </div>
          </div>

          {/* Review Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>

          {/* Review Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Review Notes
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Add any review comments..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                status === 'approved' 
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
