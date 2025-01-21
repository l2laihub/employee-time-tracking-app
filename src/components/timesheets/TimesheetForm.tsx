import React, { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
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
  const [totalHours, setTotalHours] = useState(0);

  const calculateHours = (clockIn: string, clockOut: string | null): number => {
    if (!clockOut) return 0;
    const minutes = differenceInMinutes(new Date(clockOut), new Date(clockIn));
    return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
  };

  useEffect(() => {
    const total = entries.reduce((sum, entry) => {
      return sum + calculateHours(entry.clockIn, entry.clockOut);
    }, 0);
    setTotalHours(Math.round(total * 100) / 100); // Round to 2 decimal places
  }, [entries]);

  const validateEntries = () => {
    for (const entry of entries) {
      if (!entry.clockOut) {
        alert('All entries must have a clock out time before submission');
        return false;
      }
      
      const clockInTime = new Date(entry.clockIn).getTime();
      const clockOutTime = new Date(entry.clockOut).getTime();
      
      if (clockOutTime <= clockInTime) {
        alert('Clock out time must be after clock in time for all entries');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEntries()) {
      return;
    }

    onSubmit({
      ...timesheet,
      notes,
      timeEntries: entries,
      totalHours, // Include calculated total hours
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
    <form onSubmit={handleSubmit}>
      <div className="p-4 sm:p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Timesheet for Week of {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Review your time entries and add any notes before submission.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">Time Entries</h4>
            <div className="text-sm font-medium text-gray-900">
              Total Hours: {totalHours}
            </div>
          </div>
          {entries.map((entry, index) => (
            <div key={entry.id} className="bg-gray-50 p-4 rounded-md">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="font-medium">{format(new Date(entry.clockIn), 'MMM d, yyyy')}</p>
                    <div className="text-sm text-gray-600 mb-2">
                      Hours: {calculateHours(entry.clockIn, entry.clockOut)}
                    </div>
                    {timesheet.status !== 'approved' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={format(new Date(entry.clockIn), 'HH:mm')}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const clockInDate = new Date(entry.clockIn);
                            clockInDate.setHours(parseInt(hours), parseInt(minutes));
                            
                            const newEntries = [...entries];
                            newEntries[index] = {
                              ...entry,
                              clockIn: clockInDate.toISOString()
                            };
                            setEntries(newEntries);
                          }}
                          className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : ''}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const clockOutDate = new Date(entry.clockIn); // Use clockIn date
                            clockOutDate.setHours(parseInt(hours), parseInt(minutes));
                            
                            // Validate clock out time is after clock in time
                            const clockInTime = new Date(entry.clockIn).getTime();
                            if (clockOutDate.getTime() <= clockInTime) {
                              alert('Clock out time must be after clock in time');
                              return;
                            }
                            
                            const newEntries = [...entries];
                            newEntries[index] = {
                              ...entry,
                              clockOut: clockOutDate.toISOString()
                            };
                            setEntries(newEntries);
                          }}
                          className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
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

        {timesheet.status === 'approved' && (
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.873-1.562 3.157-1.562 4.03 0l6.28 11.226c.873 1.562-.217 3.519-2.015 3.519H4.22c-1.798 0-2.888-1.957-2.015-3.519l6.28-11.226zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Read Only</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  This timesheet has been approved and cannot be edited.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom action buttons */}
      <div className="border-t p-4 sm:p-6 bg-white sticky bottom-0 rounded-b-lg">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {timesheet.status === 'approved' ? 'Close' : 'Submit Timesheet'}
          </button>
        </div>
      </div>
    </form>
  );
}
