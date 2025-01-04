import React from 'react';
import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { mockTimeEntries, mockJobLocations } from '../../lib/mockData';
import { useAuth } from '../../contexts/AuthContext';

export default function RecentTimeEntries() {
  const { user } = useAuth();
  const userEntries = mockTimeEntries
    .filter(entry => entry.userId === user?.id)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {userEntries.map((entry) => {
        const location = mockJobLocations.find(loc => loc.id === entry.jobLocationId);
        return (
          <div key={entry.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <div className="flex justify-between">
                <p className="font-medium">
                  {format(new Date(entry.clockIn), 'MMM d, yyyy')}
                </p>
                <span className="text-sm text-gray-500">
                  {format(new Date(entry.clockIn), 'h:mm a')}
                </span>
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {location?.name}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {entry.workDescription}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}