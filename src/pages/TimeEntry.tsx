import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockJobLocations, mockTimeEntries } from '../lib/mockData';
import JobSelector from '../components/time-entry/JobSelector';
import TimeControls from '../components/time-entry/TimeControls';
import StatusBadge from '../components/time-entry/StatusBadge';
import TimeEntryList from '../components/time-entry/TimeEntryList';

export default function TimeEntry() {
  const { user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState(
    mockTimeEntries.find(entry => entry.userId === user?.id && !entry.clockOut)
  );
  const [isOnBreak, setIsOnBreak] = useState(false);

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
    setActiveEntry(newEntry);
    setIsOnBreak(false);
  };

  const handleClockOut = () => {
    if (activeEntry) {
      activeEntry.clockOut = new Date().toISOString();
      activeEntry.status = 'completed';
      setActiveEntry(null);
      setSelectedJobId(null);
      setIsOnBreak(false);
    }
  };

  const handleStartBreak = () => {
    setIsOnBreak(true);
  };

  const handleEndBreak = () => {
    setIsOnBreak(false);
  };

  const getStatus = () => {
    if (!activeEntry) return 'inactive';
    return isOnBreak ? 'break' : 'working';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Time Entry</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Current Status</h2>
          <StatusBadge status={getStatus()} />
        </div>

        {!activeEntry && (
          <JobSelector
            jobs={mockJobLocations}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
          />
        )}

        {activeEntry && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="mb-4">
              <p className="font-medium text-blue-900">
                {mockJobLocations.find(loc => loc.id === activeEntry.jobLocationId)?.name}
              </p>
              <p className="text-sm text-blue-700">
                Started at: {new Date(activeEntry.clockIn).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        <TimeControls
          isActive={!!activeEntry}
          isOnBreak={isOnBreak}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
        />
      </div>

      <TimeEntryList 
        entries={mockTimeEntries.filter(entry => entry.userId === user?.id)}
        locations={mockJobLocations}
      />
    </div>
  );
}