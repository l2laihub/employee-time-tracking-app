import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TimesheetEntry, TimeEntry } from '../../lib/types';
import { mockJobLocations } from '../../lib/mockData';

interface TimesheetReviewFormProps {
  timesheet: TimesheetEntry;
  onSubmit: (timesheet: TimesheetEntry) => void;
  onCancel: () => void;
}

export default function TimesheetReviewForm({ 
  timesheet, 
  onSubmit, 
  onCancel 
}: TimesheetReviewFormProps) {
  console.log('Full timesheet data:', JSON.stringify(timesheet, null, 2));
  console.log('Expected employee:', timesheet.employeeName);
  console.log('Time entries:', timesheet.timeEntries);
  console.log('Timesheet ID:', timesheet.id);
  
  const [reviewNotes, setReviewNotes] = useState('');
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [entries, setEntries] = useState<TimeEntry[]>(timesheet.timeEntries || []);
  const [totalHours, setTotalHours] = useState(timesheet.totalHours);

  const calculateTotalHours = (entries: TimeEntry[]) => {
    return entries.reduce((total, entry) => {
      if (!entry.clockOut) return total;
      const clockIn = new Date(entry.clockIn);
      const clockOut = new Date(entry.clockOut);
      
      // Handle same-day entries
      if (clockIn.toDateString() === clockOut.toDateString()) {
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      
      // Handle multi-day entries (split into daily chunks)
      let currentDate = new Date(clockIn);
      let totalEntryHours = 0;
      
      while (currentDate <= clockOut) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const start = currentDate.getTime() === clockIn.getTime() 
          ? clockIn 
          : new Date(dayStart);
        const end = currentDate.toDateString() === clockOut.toDateString()
          ? clockOut
          : new Date(dayEnd);
          
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalEntryHours += hours;
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
      }
      
      return total + totalEntryHours;
    }, 0);
  };

  useEffect(() => {
    const newTotal = calculateTotalHours(entries);
    setTotalHours(Math.round(newTotal * 100) / 100); // Round to 2 decimal places
  }, [entries]);

  const handleLocationChange = (entryIndex: number, locationId: string) => {
    const newEntries = [...entries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      jobLocationId: locationId
    };
    setEntries(newEntries);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...timesheet,
      status,
      reviewedAt: new Date().toISOString(),
      notes: timesheet.notes + (reviewNotes ? `\n\nReview Notes: ${reviewNotes}` : ''),
      timeEntries: entries,
      totalHours: totalHours
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Review Timesheet - {timesheet?.employeeName || 'Unknown Employee'} - Week of {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Total Hours: {totalHours.toFixed(2)}
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Time Entries</h4>
        {entries.map((entry, index) => (
          <div key={entry.id} className="bg-gray-50 p-4 rounded-md">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="font-medium">{format(new Date(entry.clockIn), 'MMM d, yyyy')}</p>
                  {['pending', 'submitted'].includes(timesheet.status) ? (
                    <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-xs text-gray-500">Hours</label>
                      <p className="text-sm text-gray-600">
                        {entry.clockOut 
                          ? `${((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)}h`
                          : 'In Progress'}
                      </p>
                    </div>
                      <div>
                        <label className="block text-xs text-gray-500">Clock In</label>
                        <input
                          type="time"
                          value={format(new Date(entry.clockIn), 'HH:mm')}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const date = new Date(entry.clockIn);
                            date.setHours(parseInt(hours), parseInt(minutes));
                            const newEntries = [...entries];
                            newEntries[index] = { ...entry, clockIn: date.toISOString() };
                            setEntries(newEntries);
                          }}
                          className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Clock Out</label>
                        <input
                          type="time"
                          value={entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : ''}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const date = entry.clockOut ? new Date(entry.clockOut) : new Date(entry.clockIn);
                            date.setHours(parseInt(hours), parseInt(minutes));
                            const newEntries = [...entries];
                            newEntries[index] = { ...entry, clockOut: date.toISOString() };
                            setEntries(newEntries);
                          }}
                          className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {format(new Date(entry.clockIn), 'h:mm a')} - 
                      {entry.clockOut ? format(new Date(entry.clockOut), 'h:mm a') : 'In Progress'}
                    </p>
                  )}
                </div>
                <select
                  value={entry.jobLocationId}
                  onChange={(e) => handleLocationChange(index, e.target.value)}
                  className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {mockJobLocations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={entry.workDescription || ''}
                onChange={(e) => {
                  const newEntries = [...entries];
                  newEntries[index] = { ...entry, workDescription: e.target.value };
                  setEntries(newEntries);
                }}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Add description..."
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Employee Notes
        </label>
        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
          {timesheet.notes || 'No notes provided'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Review Notes
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Add any review comments..."
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Submit Review
        </button>
      </div>
    </form>
  );
}
