import React from 'react';
import { TimeEntry, JobLocation } from '../../lib/mockData';
import { formatDistanceToNow } from 'date-fns';

interface TimeEntryListProps {
  entries: TimeEntry[];
  locations: JobLocation[];
}

export default function TimeEntryList({ entries, locations }: TimeEntryListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Recent Time Entries</h2>
      <div className="space-y-4">
        {entries.map(entry => {
          const location = locations.find(loc => loc.id === entry.jobLocationId);
          const startTime = new Date(entry.clockIn);
          const endTime = entry.clockOut ? new Date(entry.clockOut) : null;
          
          return (
            <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{location?.name}</p>
                <p className="text-sm text-gray-600">
                  {startTime.toLocaleDateString()} {startTime.toLocaleTimeString()}
                  {endTime ? ` - ${endTime.toLocaleTimeString()}` : ' (In Progress)'}
                </p>
                {entry.workDescription && (
                  <p className="mt-1 text-sm text-gray-500">{entry.workDescription}</p>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  entry.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {entry.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  {formatDistanceToNow(startTime, { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}