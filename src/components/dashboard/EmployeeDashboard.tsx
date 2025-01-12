import React from 'react';
import { Clock, MapPin, CheckCircle, AlertCircle, Building2, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatsGrid from './StatsGrid';
import { mockTimeEntries, mockJobLocations } from '../../lib/mockData';

export default function EmployeeDashboard() {
  const { user } = useAuth();

  // Get user's time entries
  const userTimeEntries = mockTimeEntries.filter(entry => entry.userId === user?.id);
  
  // Calculate statistics
  const todayEntries = userTimeEntries.filter(entry => {
    const entryDate = new Date(entry.clockIn);
    const today = new Date();
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  const activeEntry = userTimeEntries.find(entry => !entry.clockOut);
  const completedToday = todayEntries.filter(entry => entry.clockOut).length;

  // Get assigned locations (all active locations for this example)
  const assignedLocations = mockJobLocations.filter(loc => loc.isActive);

  const stats = [
    {
      label: 'Current Status',
      value: activeEntry ? 'Working' : 'Not Clocked In',
      icon: Clock,
      trend: activeEntry 
        ? `Since ${new Date(activeEntry.clockIn).toLocaleTimeString()}`
        : 'Clock in to start tracking time'
    },
    {
      label: 'Today\'s Entries',
      value: String(completedToday),
      icon: CheckCircle,
      trend: 'Completed jobs today'
    },
    {
      label: 'Assigned Locations',
      value: String(assignedLocations.length),
      icon: MapPin,
      trend: 'Available work locations'
    },
    {
      label: 'Active Tasks',
      value: activeEntry ? '1' : '0',
      icon: AlertCircle,
      trend: activeEntry 
        ? `At ${mockJobLocations.find(loc => loc.id === activeEntry.jobLocationId)?.name}`
        : 'No active tasks'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="text-gray-600">Here's your work overview</p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Time Entry */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Current Activity</h2>
          {activeEntry ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="font-medium text-blue-900">Currently Working</span>
                  </div>
                  <span className="text-sm text-blue-600">
                    Started at {new Date(activeEntry.clockIn).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center text-sm text-blue-800">
                    <MapPin className="w-4 h-4 mr-1" />
                    {mockJobLocations.find(loc => loc.id === activeEntry.jobLocationId)?.name}
                  </div>
                  {activeEntry.workDescription && (
                    <p className="mt-2 text-sm text-blue-800">{activeEntry.workDescription}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No active time entry</p>
              <p className="text-sm">Clock in to start tracking your work</p>
            </div>
          )}
        </div>

        {/* Assigned Locations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Assigned Locations</h2>
          <div className="space-y-3">
            {assignedLocations.map(location => (
              <div key={location.id} className="p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center">
                  {location.type === 'commercial' ? (
                    <Building2 className="w-5 h-5 text-blue-500 mr-2" />
                  ) : (
                    <Home className="w-5 h-5 text-green-500 mr-2" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{location.name}</h3>
                    <p className="text-sm text-gray-500">
                      {location.city}, {location.state}
                    </p>
                  </div>
                  <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${location.serviceType === 'both'
                      ? 'bg-purple-100 text-purple-800'
                      : location.serviceType === 'hvac'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {location.serviceType === 'both' ? 'HVAC & Plumbing' : location.serviceType.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Completed Entries */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Today's Work History</h2>
          {todayEntries.length > 0 ? (
            <div className="space-y-4">
              {todayEntries.map(entry => {
                const location = mockJobLocations.find(loc => loc.id === entry.jobLocationId);
                return (
                  <div key={entry.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{location?.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.clockOut 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.clockOut ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(entry.clockIn).toLocaleTimeString()} - {
                          entry.clockOut 
                            ? new Date(entry.clockOut).toLocaleTimeString()
                            : 'Ongoing'
                        }
                      </p>
                      {entry.workDescription && (
                        <p className="text-sm text-gray-600 mt-2">{entry.workDescription}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No time entries for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}