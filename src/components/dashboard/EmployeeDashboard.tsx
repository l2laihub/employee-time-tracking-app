import React, { useState } from 'react';
import { Clock, MapPin, CheckCircle, AlertCircle, Building2, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTimeEntry } from '../../contexts/TimeEntryContext';
import StatsGrid from './StatsGrid';
import { mockTimeEntries, mockJobLocations } from '../../lib/mockData';
import JobSelector from '../time-entry/JobSelector';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { activeEntry, setActiveEntry, isOnBreak, startBreak, endBreak } = useTimeEntry();

  const handleClockIn = () => {
    if (!selectedJobId) return;

    const newEntry = {
      id: String(mockTimeEntries.length + 1),
      userId: user?.id || '',
      jobLocationId: selectedJobId,
      clockIn: new Date().toISOString(),
      clockOut: null,
      serviceType: mockJobLocations.find(job => job.id === selectedJobId)?.serviceType === 'both' 
        ? 'hvac' 
        : (mockJobLocations.find(job => job.id === selectedJobId)?.serviceType || 'hvac'),
      workDescription: '',
      status: 'in-progress' as const
    };
    mockTimeEntries.push(newEntry);
    setSelectedJobId(null);
    setActiveEntry(newEntry);
  };

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

  const completedToday = todayEntries.filter(entry => entry.clockOut).length;

  // Get assigned locations (all active locations for this example)
  const assignedLocations = mockJobLocations.filter(loc => loc.isActive);

    const stats = [
      {
        label: 'Current Status',
        value: activeEntry 
          ? isOnBreak 
            ? 'On Break'
            : 'Working' 
          : 'Not Clocked In',
        icon: Clock,
        trend: activeEntry 
          ? `Since ${new Date(activeEntry.clockIn).toLocaleTimeString()}`
          : 'Click to go to Time Entry page',
        onClick: () => navigate('/time-entry')
      },
      {
        label: 'Today\'s Entries',
        value: String(completedToday),
        icon: CheckCircle,
        trend: 'Completed jobs today'
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

      <div className="grid grid-cols-1 gap-6">
        {/* Active Time Entry */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Current Activity</h2>
          {activeEntry ? (
            <div className="space-y-4">
              <div className={`p-4 ${isOnBreak ? 'bg-orange-50' : 'bg-blue-50'} rounded-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className={`w-5 h-5 ${isOnBreak ? 'text-orange-500' : 'text-blue-500'} mr-2`} />
                    <span className={`font-medium ${isOnBreak ? 'text-orange-900' : 'text-blue-900'}`}>
                      {isOnBreak ? 'On Break' : 'Currently Working'}
                    </span>
                  </div>
                  <span className={`text-sm ${isOnBreak ? 'text-orange-600' : 'text-blue-600'}`}>
                    Started at {new Date(activeEntry.clockIn).toLocaleTimeString()}
                  </span>
                </div>
                {isOnBreak && (
                  <button
                    onClick={endBreak}
                    className="mt-4 w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    End Break
                  </button>
                )}
                {!isOnBreak && (
                  <button
                    onClick={startBreak}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Start Break
                  </button>
                )}
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
            <div className="space-y-6">
              <div className="text-center py-4 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No active time entry</p>
                <p className="text-sm">Select a location and clock in to start tracking your work</p>
              </div>
              
              <JobSelector
                jobs={mockJobLocations}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
              />

              {selectedJobId && (
                <button
                  onClick={handleClockIn}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Clock In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Today's Completed Entries */}
        <div className="bg-white rounded-lg shadow p-6">
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
