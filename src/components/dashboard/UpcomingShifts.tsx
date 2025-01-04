import React from 'react';
import { format, addDays } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { mockJobLocations } from '../../lib/mockData';

export default function UpcomingShifts() {
  // Mock upcoming shifts
  const shifts = [
    {
      id: 1,
      date: new Date(),
      startTime: '14:00',
      endTime: '22:00',
      locationId: '1'
    },
    {
      id: 2,
      date: addDays(new Date(), 1),
      startTime: '09:00',
      endTime: '17:00',
      locationId: '2'
    },
    {
      id: 3,
      date: addDays(new Date(), 2),
      startTime: '10:00',
      endTime: '18:00',
      locationId: '3'
    }
  ];

  return (
    <div className="space-y-4">
      {shifts.map((shift) => {
        const location = mockJobLocations.find(loc => loc.id === shift.locationId);
        return (
          <div key={shift.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <p className="font-medium">
                {format(shift.date, 'EEEE, MMM d')}
              </p>
              <p className="text-sm text-gray-600">
                {shift.startTime} - {shift.endTime}
              </p>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {location?.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}