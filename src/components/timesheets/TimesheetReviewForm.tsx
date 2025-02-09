import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Timesheet, TimeEntry, JobLocation } from '../../types/custom.types';
import { getTimesheetDetails, updateTimeEntry } from '../../services/timesheets';
import { listLocations } from '../../services/jobLocations';
import { useOrganization } from '../../contexts/OrganizationContext';

interface TimesheetReviewFormProps {
  timesheet: Timesheet;
  onSubmit: (status: string, reviewNotes?: string, timesheetData?: Timesheet) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function TimesheetReviewForm({ 
  timesheet: initialTimesheet, 
  onSubmit, 
  onClose,
  isAdmin = false
}: TimesheetReviewFormProps) {
  const { organization } = useOrganization();
  const [timesheet, setTimesheet] = useState<Timesheet>(initialTimesheet);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [jobLocations, setJobLocations] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState(initialTimesheet.review_notes || '');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editingHours, setEditingHours] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDetails();
    if (organization?.id) {
      loadJobLocations();
    }
  }, [initialTimesheet.id, organization?.id]);

  const loadDetails = async () => {
    try {
      const details = await getTimesheetDetails(initialTimesheet.id);
      if (details.timesheet) {
        setTimesheet(details.timesheet);
      }
      if (details.timeEntries) {
        setTimeEntries(details.timeEntries);
      }
    } catch (error) {
      console.error('Error loading timesheet details:', error);
      setError('Failed to load timesheet details');
    } finally {
      setLoading(false);
    }
  };

  const loadJobLocations = async () => {
    try {
      const result = await listLocations(organization!.id);
      if (result.success && Array.isArray(result.data)) {
        setJobLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading job locations:', error);
    }
  };

  const calculateTotalHours = (entry: TimeEntry) => {
    if (!entry.clock_in || !entry.clock_out) return 0;
    
    try {
      const clockIn = new Date(entry.clock_in);
      const clockOut = new Date(entry.clock_out);
      
      // Calculate hours between clock in and clock out
      let hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      
      // Subtract break hours if any
      const breakHours = (entry.total_break_minutes || 0) / 60;
      hours = hours - breakHours;
      
      // Round to 2 decimal places
      return Math.round(hours * 100) / 100;
    } catch (error) {
      console.error('Error calculating total hours:', error);
      return 0;
    }
  };

  const calculateTimesheetTotal = (entries: TimeEntry[]) => {
    const total = entries.reduce((sum, entry) => {
      return sum + calculateTotalHours(entry);
    }, 0);
    return Math.round(total * 100) / 100;
  };

  useEffect(() => {
    // Update total hours whenever time entries change
    if (timesheet && timeEntries.length > 0) {
      const total = calculateTimesheetTotal(timeEntries);
      console.log('Updating timesheet total hours:', total);
      setTimesheet({
        ...timesheet,
        total_hours: total
      });
    }
  }, [timeEntries]);

  useEffect(() => {
    // Update total hours whenever editing entry changes
    if (editingEntry) {
      const hours = calculateTotalHours(editingEntry);
      setEditingHours(hours);
    }
  }, [editingEntry?.clock_in, editingEntry?.clock_out, editingEntry?.total_break_minutes]);

  const formatTimeForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format to local date-time string that works with datetime-local input
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      console.error('Error formatting time for input:', error);
      return '';
    }
  };

  // Check if the timesheet can be edited
  const canEdit = useCallback(() => {
    if (isAdmin) return true;
    return timesheet.status === 'draft' || timesheet.status === 'submitted';
  }, [isAdmin, timesheet.status]);

  const handleEditEntry = (entry: TimeEntry) => {
    // Only allow editing if user has permission
    if (!canEdit()) return;
    
    // Ensure we have all the fields from the TimeEntry interface
    setEditingEntry({
      ...entry,
      clock_in: formatTimeForInput(entry.clock_in),
      clock_out: formatTimeForInput(entry.clock_out),
      total_break_minutes: entry.total_break_minutes || 0,
      job_location_id: entry.job_location_id,
      service_type: entry.service_type || null,
      work_description: entry.work_description || '',
      status: entry.status || null
    });
  };

  const handleSaveEntry = async () => {
    if (!editingEntry || !canEdit()) return;

    try {
      // Validate required fields
      if (!editingEntry.clock_in || !editingEntry.job_location_id) {
        setError('Clock In time and Job Location are required');
        return;
      }

      const clockIn = parseISO(editingEntry.clock_in);
      const clockOut = editingEntry.clock_out ? parseISO(editingEntry.clock_out) : null;

      const updatedEntry = {
        ...editingEntry,
        timesheet_id: timesheet.id,
        clock_in: clockIn.toISOString(),
        clock_out: clockOut ? clockOut.toISOString() : null,
        total_break_minutes: editingEntry.total_break_minutes || 0,
        total_hours: clockOut ? calculateTotalHours({
          ...editingEntry,
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString()
        }) : 0
      };

      await updateTimeEntry(updatedEntry);
      await loadDetails();
      setEditingEntry(null);
      setError('');
    } catch (error) {
      console.error('Error updating time entry:', error);
      setError('Failed to update time entry');
    }
  };

  const handleEditingChange = (field: keyof TimeEntry, value: string | number | null) => {
    if (!editingEntry) return;
    
    const updatedEntry = {
      ...editingEntry,
      [field]: value
    };
    setEditingEntry(updatedEntry);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    console.log('Submitting timesheet:', { timesheet, reviewNotes });
    
    try {
      // Validate there are time entries
      if (timeEntries.length === 0) {
        setError('Cannot submit timesheet with no time entries');
        return;
      }

      // Calculate total hours from time entries
      const total = calculateTimesheetTotal(timeEntries);
      if (total <= 0) {
        setError('Total hours must be greater than 0');
        return;
      }

      console.log('Submitting timesheet with total hours:', total);
      await onSubmit('submitted', reviewNotes, { ...timesheet, total_hours: total, review_notes: reviewNotes });
      console.log('Timesheet submitted successfully');
      onClose(); // Only close on success
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit timesheet');
      // Don't close form on error - let user try again
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-500">Loading timesheet details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
          <div className="sticky top-0 z-10 bg-white rounded-t-lg border-b border-gray-200">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Timesheet - Week of {format(new Date(timesheet.period_start_date), 'MMM d, yyyy')}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Total Hours: {timesheet.total_hours}
              </p>
            </div>
          </div>

          {error && (
            <div className="px-4 sm:px-6 py-2 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="px-4 sm:px-6 py-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="space-y-4">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  {editingEntry?.id === entry.id ? (
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Time Entry</h3>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Clock In *</label>
                              <input
                                type="datetime-local"
                                value={editingEntry.clock_in}
                                onChange={(e) => handleEditingChange('clock_in', e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Clock Out</label>
                              <input
                                type="datetime-local"
                                value={editingEntry.clock_out || ''}
                                onChange={(e) => handleEditingChange('clock_out', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Break Minutes</label>
                              <input
                                type="number"
                                value={editingEntry.total_break_minutes || 0}
                                onChange={(e) => handleEditingChange('total_break_minutes', Number(e.target.value))}
                                min="0"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Job Location *</label>
                              <select
                                value={editingEntry.job_location_id}
                                onChange={(e) => handleEditingChange('job_location_id', e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">Select a location</option>
                                {jobLocations.map((location) => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Service Type</label>
                            <select
                              value={editingEntry.service_type || ''}
                              onChange={(e) => handleEditingChange('service_type', e.target.value || null)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                              <option value="">Select a service type</option>
                              <option value="hvac">HVAC</option>
                              <option value="plumbing">Plumbing</option>
                              <option value="both">Both</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Work Description</label>
                            <textarea
                              value={editingEntry.work_description || ''}
                              onChange={(e) => handleEditingChange('work_description', e.target.value)}
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              placeholder="Enter work description..."
                            />
                          </div>

                          <div className="mt-4 p-3 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-500">Total Hours:</span>
                              <span className="text-lg font-semibold text-gray-900">{editingHours.toFixed(2)}</span>
                            </div>
                          </div>

                          {error && (
                            <div className="text-sm text-red-600 mt-2">
                              {error}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntry(null);
                              setError('');
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEntry}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="text-sm text-gray-900">
                          {format(new Date(entry.clock_in), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Hours</p>
                        <p className="text-sm text-gray-900">
                          {calculateTotalHours(entry)} hours
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Clock In</p>
                        <p className="text-sm text-gray-900">
                          {format(new Date(entry.clock_in), 'h:mm a')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Clock Out</p>
                        <p className="text-sm text-gray-900">
                          {entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : '-'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="text-sm text-gray-900">
                          {jobLocations.find(loc => loc.id === entry.job_location_id)?.name || 'Unknown Location'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Description</p>
                        <p className="text-sm text-gray-900">
                          {entry.work_description || 'No description provided'}
                        </p>
                      </div>
                      {canEdit() && (
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this timesheet..."
                />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 mt-6 px-4 py-3 -mx-4 sm:-mx-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {!isAdmin && (timesheet.status === 'draft' || timesheet.status === 'submitted') && (
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Timesheet
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
