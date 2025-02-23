import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { listTimeEntries } from '../../services/timeEntries';
import { JobLocation, TimeEntry } from '../../types/custom.types';
import { listEmployees } from '../../services/employees';
import type { Employee } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { Card, Badge, LoadingSpinner, Button } from '../design-system';
import { toast } from '../../lib/toast';

interface EmployeeWithMember extends Employee {
  organization_members?: {
    id: string;
    user_id: string;
    role: string;
  };
}

export default function ActivityFeed() {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, EmployeeWithMember>>({});
  const [jobLocations, setJobLocations] = useState<Record<string, JobLocation>>({});

  // Fetch today's time entries
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
          const entries = Array.isArray(result.data) ? result.data : [result.data];
          setTimeEntries(entries);

          // Get all employees
          const employeesResult = await listEmployees(organization.id);
          
          console.log('Employees data:', employeesResult.data);
          
          // Create employee map using organization_members user_id as the key
          const employeeMap = employeesResult.success && Array.isArray(employeesResult.data)
            ? (employeesResult.data as EmployeeWithMember[]).reduce((acc: Record<string, EmployeeWithMember>, employee) => {
                console.log('Processing employee:', employee);
                if (employee.organization_members?.user_id) {
                  console.log('Mapping user_id:', employee.organization_members.user_id);
                  acc[employee.organization_members.user_id] = employee;
                }
                return acc;
              }, {})
            : {};
          
          console.log('Final employee map:', employeeMap);
          setEmployees(employeeMap);

          console.log('Time entries:', entries);

          // Fetch job location information
          const locationIds = [...new Set(entries.map(entry => entry.job_location_id))];
          const { data: locationData, error: locationError } = await supabase
            .from('job_locations')
            .select('id, name')
            .in('id', locationIds);

          if (locationError) throw locationError;

          // Create location map
          const locationMap = (locationData || []).reduce((acc: Record<string, JobLocation>, loc) => ({
            ...acc,
            [loc.id]: loc
          }), {});

          setJobLocations(locationMap);
        } else {
          throw new Error(result.error || 'Failed to fetch time entries');
        }
      } catch (err) {
        const message = 'Failed to fetch activity data';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        });
        console.error('Error fetching activity data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeEntries();
  }, [organization?.id]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeEntries.map((entry) => {
        console.log('Looking up employee for entry:', {
          entryUserId: entry.user_id,
          availableEmployees: Object.keys(employees)
        });
        const employee = employees[entry.user_id];
        console.log('Found employee:', employee);
        return (
          <Card
            key={entry.id}
            className="hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-start space-x-4">
              <Clock className="w-5 h-5 text-primary-500 mt-1" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium text-neutral-900">
                    {employee
                      ? `${employee.first_name} ${employee.last_name}`
                      : `Employee #${entry.user_id}`}
                  </p>
                  <span className="text-sm text-neutral-500">
                    {format(new Date(entry.clock_in), 'h:mm a')}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-neutral-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    {jobLocations[entry.job_location_id]?.name || `Location #${entry.job_location_id}`}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={!entry.clock_out ? 'success' : 'default'}
                      size="sm"
                    >
                      {!entry.clock_out ? 'Currently Working' : 'Clocked Out'}
                    </Badge>
                    
                    {entry.break_start && !entry.break_end && (
                      <Badge
                        variant="warning"
                        size="sm"
                      >
                        On Break
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-neutral-600">
                    {entry.clock_out ? (
                      <>
                        Duration: {((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                        {entry.total_break_minutes > 0 && ` (${entry.total_break_minutes}m break)`}
                        <span className="mx-2">•</span>
                        Out: {format(new Date(entry.clock_out), 'h:mm a')}
                      </>
                    ) : (
                      <>
                        Duration: {((new Date().getTime() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                        {entry.total_break_minutes > 0 && ` (${entry.total_break_minutes}m break)`}
                      </>
                    )}
                  </div>

                  {entry.work_description && (
                    <p className="text-sm text-neutral-600 bg-neutral-50 p-2 rounded-md">
                      {entry.work_description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {timeEntries.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <p>No activity today</p>
        </div>
      )}
    </div>
  );
}
