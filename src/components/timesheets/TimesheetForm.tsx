import React, { useState } from 'react';
import { format } from 'date-fns';
import type { TimesheetEntry, TimeEntry } from '../../lib/types';
import { mockJobLocations } from '../../lib/mockData';

interface TimesheetFormProps {
  timesheet: TimesheetEntry;
  onSubmit: (timesheet: TimesheetEntry) => void;
  onCancel: () => void;
}

export default function TimesheetForm({ timesheet, onSubmit, onCancel }: TimesheetFormProps) {
  const [notes, setNotes] = useState(timesheet.notes);
  const [entries, setEntries] = useState<TimeEntry[]>(timesheet.timeEntries);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...timesheet,
      notes,
      timeEntries: entries,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  };

  const handleLocationChange = (entryIndex: number, locationId: string) => {
    const newEntries = [...entries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      jobLocationId: locationId
    };
    setEntries(newEntries);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Timesheet for Week of {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Review your time entries and add any notes before submission.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Time Entries</h4>
        {entries.map((entry, index) => (
          <div key={entry.id} className="bg-gray-50 p-4 rounded-md">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{format(new Date(entry.clockIn), 'MMM d, yyyy')}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(entry.clockIn), 'h:mm a')} - 
                    {entry.clockOut ? format(new Date(entry.clockOut), 'h:mm a') : 'In Progress'}
                  </p>
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
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Add any additional notes or comments..."
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
          Submit Timesheet
        </button>
      </div>
    </form>
  );
}