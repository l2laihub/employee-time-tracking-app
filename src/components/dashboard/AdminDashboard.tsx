import React, { useState, useEffect } from 'react';
import { Users, Clock, CalendarDays, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Card, LoadingSpinner, Button } from '../design-system';
import ActivityFeed from './ActivityFeed';
import StatsGrid from './StatsGrid';
import { listTimesheetsForOrganization } from '../../services/timesheets';
import { listTimeEntries } from '../../services/timeEntries';
import { listPTORequests } from '../../services/pto';
import { supabase } from '../../lib/supabase';
import { TimeEntry, Timesheet } from '../../types/custom.types';
import { toast } from '../../lib/toast';

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
  
  const [isLoading, setIsLoading] = useState({
    employees: true,
    timesheets: true,
    timeEntries: true,
    ptoRequests: true
  });
  const [error, setError] = useState<string | null>(null);
  
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
        const message = 'Failed to fetch employees';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        });
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
        const message = 'Failed to fetch timesheets';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        });
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
        const message = 'Failed to fetch time entries';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        });
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
        const message = 'Failed to fetch PTO requests';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        });
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
      <Card className="p-4 bg-error-50 border-error-100">
        <p className="text-error-700">{error}</p>
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
          className="mt-2"
          size="sm"
        >
          Retry
        </Button>
      </Card>
    );
  }

  const isLoadingAny = Object.values(isLoading).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-neutral-900">
          Dashboard
        </h1>
        <p className="text-neutral-600">Overview of today's operations</p>
      </div>

      {isLoadingAny ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <StatsGrid stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-display font-semibold text-neutral-900">
                  Recent Activity
                </h2>
                <Link 
                  to="/time-entry" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View All
                </Link>
              </div>
              <ActivityFeed />
            </Card>

            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-display font-semibold text-neutral-900">
                  Department Overview
                </h2>
                <Link 
                  to="/employees" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Manage Employees
                </Link>
              </div>
              <div className="space-y-4">
                {Array.from(new Set(employees.map(user => user.department))).map(dept => {
                  const deptUsers = employees.filter(user => user.department === dept);
                  const activeUsers = deptUsers.filter(user => user.role !== 'inactive');
                  
                  return (
                    <div key={dept} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-neutral-900">{dept}</h3>
                        <p className="text-sm text-neutral-500">
                          {activeUsers.length} active / {deptUsers.length} total
                        </p>
                      </div>
                      <div className="flex -space-x-2">
                        {deptUsers.slice(0, 3).map((user) => (
                          <div
                            key={user.id}
                            className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center"
                            title={`${user.first_name} ${user.last_name}`}
                          >
                            <span className="text-xs text-primary-600 font-medium">
                              {user.first_name[0]}{user.last_name[0]}
                            </span>
                          </div>
                        ))}
                        {deptUsers.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-neutral-600 font-medium">
                              +{deptUsers.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
