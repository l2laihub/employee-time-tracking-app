import React from 'react';
import { Users, Clock, CalendarDays, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { mockUsers } from '../../lib/mockUsers';
import { mockTimeEntries } from '../../lib/mockData';
import { mockTimesheets } from '../../lib/mockData';
import { mockPTORequests } from '../../lib/mockPTOData';
import ActivityFeed from './ActivityFeed';
import StatsGrid from './StatsGrid';

export default function AdminDashboard() {
  const navigate = useNavigate();
  // Calculate dashboard statistics
  const stats = [
    {
      label: 'Active Employees',
      value: mockUsers.filter(user => user.status === 'active').length.toString(),
      icon: Users,
      trend: `${mockUsers.filter(user => user.department === 'Field Work').length} field workers`,
      onClick: () => navigate('/employees')
    },
    {
      label: 'Pending Timesheets',
      value: mockTimesheets.filter(ts => ts.status === 'submitted').length.toString(),
      icon: FileText,
      trend: 'Awaiting review',
      onClick: () => navigate('/timesheets')
    },
    {
      label: 'Total Hours Today',
      value: mockTimeEntries
        .filter(entry => entry.clockOut)
        .reduce((acc, entry) => {
          const start = new Date(entry.clockIn);
          const end = new Date(entry.clockOut!);
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0).toFixed(1),
      icon: Clock,
      trend: 'Hours logged today'
    },
    {
      label: 'PTO Requests',
      value: mockPTORequests.filter(req => req.status === 'pending').length.toString(),
      icon: CalendarDays,
      trend: 'Awaiting approval',
      onClick: () => navigate('/pto')
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of today's operations</p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link 
              to="/time-entry" 
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          <ActivityFeed />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Department Overview</h2>
            <Link 
              to="/employees" 
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manage Employees
            </Link>
          </div>
          <div className="space-y-4">
            {Array.from(new Set(mockUsers.map(user => user.department))).map(dept => {
              const deptUsers = mockUsers.filter(user => user.department === dept);
              const activeUsers = deptUsers.filter(user => user.status === 'active');
              
              return (
                <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{dept}</h3>
                    <p className="text-sm text-gray-500">
                      {activeUsers.length} active / {deptUsers.length} total
                    </p>
                  </div>
                  <div className="flex -space-x-2">
                    {deptUsers.slice(0, 3).map((user, index) => (
                      <div
                        key={user.id}
                        className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                        title={`${user.first_name} ${user.last_name}`}
                      >
                        <span className="text-xs text-blue-600 font-medium">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                    ))}
                    {deptUsers.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                        <span className="text-xs text-gray-600 font-medium">
                          +{deptUsers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
