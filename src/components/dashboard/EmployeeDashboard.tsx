import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTimeEntry } from '../../contexts/TimeEntryContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import StatsGrid from './StatsGrid';
import JobSelector from '../time-entry/JobSelector';
import { listLocations } from '../../services/jobLocations';
import { listTimeEntries, createTimeEntry } from '../../services/timeEntries';
import { getEmployeeByUserId } from '../../services/employees';
import { JobLocation, TimeEntry, Employee } from '../../lib/types';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { activeEntry, setActiveEntry, startBreak, endBreak } = useTimeEntry();
  const [employee, setEmployee] = useState<Employee | null>(null);
  
  // Add loading and error states
  const [isLoading, setIsLoading] = useState({
    locations: true,
    timeEntries: true,
    employee: true
  });
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);

  // Calculate if on break based on active entry status
  const isOnBreak = activeEntry?.status === 'break';

  // Fetch employee data
  useEffect(() => {
    async function fetchEmployee() {
      if (!user?.id || !organization?.id) return;

      try {
        const result = await getEmployeeByUserId(user.id, organization.id);
        if (result.success && result.data) {
          setEmployee(result.data as Employee);
        } else {
          throw new Error(result.error || 'Failed to fetch employee data');
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError('Failed to fetch employee data');
      } finally {
        setIsLoading(prev => ({ ...prev, employee: false }));
      }
    }

    fetchEmployee();
  }, [user?.id, organization?.id]);

  // Fetch job locations
  useEffect(() => {
    async function fetchLocations() {
      if (!organization?.id) return;
      
      try {
        const result = await listLocations(organization.id);
        if (result.success && result.data) {
          setLocations(Array.isArray(result.data) ? result.data : [result.data]);
        } else {
          setError(result.error || 'Failed to fetch locations');
        }
      } catch (err) {
        setError('Failed to fetch locations');
      } finally {
        setIsLoading(prev => ({ ...prev, locations: false }));
      }
    }

    fetchLocations();
  }, [organization?.id]);

  // Fetch today's time entries
  useEffect(() => {
    async function fetchTimeEntries() {
      if (!organization?.id || !user?.id) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const result = await listTimeEntries(organization.id, {
          employeeId: user.id,
          startDate: today,
          endDate: tomorrow
        });

        if (result.success && result.data) {
          setTodayEntries(Array.isArray(result.data) ? result.data : [result.data]);
        } else {
          setError(result.error || 'Failed to fetch time entries');
        }
      } catch (err) {
        setError('Failed to fetch time entries');
      } finally {
        setIsLoading(prev => ({ ...prev, timeEntries: false }));
      }
    }

    fetchTimeEntries();
  }, [organization?.id, user?.id]);

  const handleClockIn = async () => {
    if (!selectedJobId || !user?.id || !organization?.id) return;

    try {
      setIsLoading(prev => ({ ...prev, timeEntries: true }));
      
      const selectedLocation = locations.find(loc => loc.id === selectedJobId);
      if (!selectedLocation) {
        setError('Selected location not found');
        return;
      }

      const result = await createTimeEntry({
        user_id: user.id,
        organization_id: organization.id,
        job_location_id: selectedJobId,
        service_type: selectedLocation.service_type === 'both' ? 'hvac' : selectedLocation.service_type,
        work_description: ''
      });

      if (result.success && result.data) {
        setSelectedJobId(null);
        setActiveEntry(result.data as TimeEntry);
        setError(null);
      } else {
        setError(result.error || 'Failed to create time entry');
      }
    } catch (err) {
      setError('Failed to create time entry');
    } finally {
      setIsLoading(prev => ({ ...prev, timeEntries: false }));
    }
  };

  const completedToday = todayEntries.filter(entry => entry.clock_out).length;

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
        ? `Since ${new Date(activeEntry.clock_in).toLocaleTimeString()}`
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

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const isLoadingAny = Object.values(isLoading).some(Boolean);

  if (isLoadingAny) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {employee?.first_name || 'User'}!
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
                    Started at {new Date(activeEntry.clock_in).toLocaleTimeString()}
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
                    {locations.find(loc => loc.id === activeEntry.job_location_id)?.name}
                  </div>
                  {activeEntry.work_description && (
                    <p className="mt-2 text-sm text-blue-800">{activeEntry.work_description}</p>
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
              
              {isLoading.locations ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <JobSelector
                    jobs={locations}
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
                </>
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
                const location = locations.find(loc => loc.id === entry.job_location_id);
                return (
                  <div key={entry.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{location?.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.clock_out 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.clock_out ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(entry.clock_in).toLocaleTimeString()} - {
                          entry.clock_out 
                            ? new Date(entry.clock_out).toLocaleTimeString()
                            : 'Ongoing'
                        }
                      </p>
                      {entry.work_description && (
                        <p className="text-sm text-gray-600 mt-2">{entry.work_description}</p>
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
