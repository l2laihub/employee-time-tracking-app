import React from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatsGrid from './StatsGrid';
import UpcomingShifts from './UpcomingShifts';
import RecentTimeEntries from './RecentTimeEntries';

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Hours This Week', value: '32', icon: Clock, trend: '8 hours remaining' },
    { label: 'Completed Jobs', value: '15', icon: CheckCircle, trend: '+3 this week' },
    { label: 'Next Shift', value: 'Today 2PM', icon: Calendar, trend: 'Desert Ridge Mall' },
    { label: 'Pending Tasks', value: '2', icon: AlertCircle, trend: 'Due today' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="text-gray-600">Here's your daily overview</p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Shifts</h2>
          <UpcomingShifts />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Time Entries</h2>
          <RecentTimeEntries />
        </div>
      </div>
    </div>
  );
}