import React from 'react';
import { format } from 'date-fns';
import { mockTimeEntries } from '../../lib/mockData';
import { Clock, MapPin } from 'lucide-react';

export default function ActivityFeed() {
  const todayEntries = mockTimeEntries.filter(entry => {
    const entryDate = new Date(entry.clockIn);
    const today = new Date();
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  return (
    <div className="space-y-4">
      {todayEntries.map((entry) => (
        <div key={entry.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
          <Clock className="w-5 h-5 text-blue-500 mt-1" />
          <div className="flex-1">
            <div className="flex justify-between">
              <p className="font-medium">Employee #{entry.userId}</p>
              <span className="text-sm text-gray-500">
                {format(new Date(entry.clockIn), 'h:mm a')}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              Job #{entry.jobLocationId}
            </div>
            <p className="text-sm text-gray-600 mt-1">{entry.workDescription}</p>
          </div>
        </div>
      ))}
    </div>
  );
}