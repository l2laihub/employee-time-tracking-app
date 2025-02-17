import React, { useState, useEffect } from 'react';
import { Users, Clock, CalendarDays, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../contexts/OrganizationContext';
import ActivityFeed from './ActivityFeed';
import StatsGrid from './StatsGrid';
import { listTimesheetsForOrganization } from '../../services/timesheets';
import { listTimeEntries } from '../../services/timeEntries';
import { listPTORequests } from '../../services/pto';
import { supabase } from '../../lib/supabase';
import { TimeEntry, Timesheet } from '../../types/custom.types';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  member_id: string;
  organization_id: string;
  role: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  
  // Add loading and error states
  const [isLoading, setIsLoading] = useState({
    employees: true,
    timesheets: true,
    timeEntries: true,
    ptoRequests: true
  });
  const [error, setError] = useState<string | null>(null);
  
  // Add data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [pendingPTOCount, setPendingPTOCount] = useState(0);

  // Fetch employees
  useEffect(() => {
    async function fetchEmployees() {
      if (!organization?.id) return;

      try {
        const { data, error } = await supabase
          .from('employees')
          .select(`
            id,
            first_name,
            last_name,
            department,
            member_id,
            organization_id,
            organization_members!inner (
              role
            )
          `)
          .eq('organization_id', organization.id);

        if (error) throw error;
        
        const formattedEmployees = (data || []).map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          department: emp.department,
          member_id: emp.member_id,
          organization_id: emp.organization_id,
          role: emp.organization_members[0]?.role || 'employee'
        }));
        
        setEmployees(formattedEmployees);
      } catch (err) {
        setError('Failed to fetch employees');
        console.error('Error fetching employees:', err);
      } finally {
        setIsLoading(prev => ({ ...prev, employees: false }));
      }
    }

    fetchEmployees();
  }, [organization?.id]);

  // Fetch timesheets
  useEffect(() => {
    async function fetchTimesheets() {
      if (!organization?.id) return;

      try {
        const result = await listTimesheetsForOrganization(organization.id, 'submitted');
        if (result.success && result.data) {
          setTimesheets(Array.isArray(result.data) ? result.data : [result.data]);
        } else {
          throw new Error(result.error || 'Failed to fetch timesheets');
        }
      } catch (err) {
        setError('Failed to fetch timesheets');
        console.error('Error fetching timesheets:', err);
      } finally {
        setIsLoading(prev => ({ ...prev, timesheets: false }));
      }
    }

    fetchTimesheets();
  }, [organization?.id]);

  // Fetch time entries
  useEffect(() => {
    async function fetchTimeEntries() {
      if (!organization?.id) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const result = await listTimeEntries(organization.id, {
          startDate: today,
          endDate: tomorrow
        });

        if (result.success && result.data) {
          setTimeEntries(Array.isArray(result.data) ? result.data : [result.data]);
        } else {
          throw new Error(result.error || 'Failed to fetch time entries');
        }
      } catch (err) {
        setError('Failed to fetch time entries');
        console.error('Error fetching time entries:', err);
      } finally {
        setIsLoading(prev => ({ ...prev, timeEntries: false }));
      }
    }

    fetchTimeEntries();
  }, [organization?.id]);

  // Fetch PTO requests
  useEffect(() => {
    async function fetchPTORequests() {
      if (!organization?.id) return;

      try {
        const result = await listPTORequests(organization.id, { status: 'pending' });
        if (result.success && result.data) {
          setPendingPTOCount(Array.isArray(result.data) ? result.data.length : 1);
        } else {
          throw new Error(result.error || 'Failed to fetch PTO requests');
        }
      } catch (err) {
        setError('Failed to fetch PTO requests');
        console.error('Error fetching PTO requests:', err);
      } finally {
        setIsLoading(prev => ({ ...prev, ptoRequests: false }));
      }
    }

    fetchPTORequests();
  }, [organization?.id]);

  // Calculate total hours worked today
  const totalHoursToday = timeEntries
    .filter(entry => entry.clock_out)
    .reduce((acc, entry) => {
      const start = new Date(entry.clock_in);
      const end = new Date(entry.clock_out!);
      const breakMinutes = entry.total_break_minutes || 0;
      return acc + ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) - (breakMinutes / 60);
    }, 0);

  const stats = [
    {
      label: 'Active Employees',
      value: employees.filter(user => user.role !== 'inactive').length.toString(),
      icon: Users,
      trend: `${employees.filter(user => user.department === 'Field Work').length} field workers`,
      onClick: () => navigate('/employees')
    },
    {
      label: 'Pending Timesheets',
      value: timesheets.filter(ts => ts.status === 'submitted').length.toString(),
      icon: FileText,
      trend: 'Awaiting review',
      onClick: () => navigate('/timesheets')
    },
    {
      label: 'Total Hours Today',
      value: totalHoursToday.toFixed(1),
      icon: Clock,
      trend: 'Hours logged today'
    },
    {
      label: 'PTO Requests',
      value: pendingPTOCount.toString(),
      icon: CalendarDays,
      trend: 'Awaiting approval',
      onClick: () => navigate('/pto')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of today's operations</p>
      </div>

      {isLoadingAny ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
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
                {Array.from(new Set(employees.map(user => user.department))).map(dept => {
                  const deptUsers = employees.filter(user => user.department === dept);
                  const activeUsers = deptUsers.filter(user => user.role !== 'inactive');
                  
                  return (
                    <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{dept}</h3>
                        <p className="text-sm text-gray-500">
                          {activeUsers.length} active / {deptUsers.length} total
                        </p>
                      </div>
                      <div className="flex -space-x-2">
                        {deptUsers.slice(0, 3).map((user) => (
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
        </>
      )}
    </div>
  );
}
