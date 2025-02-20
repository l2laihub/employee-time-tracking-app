import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { listTimeEntries } from '../../services/timeEntries';
import { JobLocation, TimeEntry } from '../../types/custom.types';
import { listEmployees } from '../../services/employees';
import type { Employee } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export default function ActivityFeed() {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
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

          // Get all employees with their organization member data
          const employeesResult = await listEmployees(organization.id);
          
          // Create employee map using organization_members.user_id as the key
          const employeeMap = employeesResult.success && Array.isArray(employeesResult.data) 
            ? employeesResult.data.reduce((acc: Record<string, Employee>, employee) => {
                if (employee.organization_members?.user_id) {
                  acc[employee.organization_members.user_id] = employee;
                }
                return acc;
              }, {})
            : {};
          
          setEmployees(employeeMap);

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

          setEmployees(employeeMap);
          setJobLocations(locationMap);
        } else {
          throw new Error(result.error || 'Failed to fetch time entries');
        }
      } catch (err) {
        setError('Failed to fetch activity data');
        console.error('Error fetching activity data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeEntries();
  }, [organization?.id]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeEntries.map((entry) => {
        const employee = employees[entry.user_id];
        return (
          <div key={entry.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-500 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="font-medium">
                  {employee 
                    ? `${employee.first_name} ${employee.last_name}`
                    : `Employee #${entry.user_id}`}
                </p>
                <span className="text-sm text-gray-500">
                  {format(new Date(entry.clock_in), 'h:mm a')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  {jobLocations[entry.job_location_id]?.name || `Location #${entry.job_location_id}`}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Status badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    !entry.clock_out
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {!entry.clock_out ? 'Currently Working' : 'Clocked Out'}
                  </span>
                  
                  {/* Break status if on break */}
                  {entry.break_start && !entry.break_end && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      On Break
                    </span>
                  )}
                </div>

                {/* Duration and times */}
                <div className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-600">{entry.work_description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {timeEntries.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p>No activity today</p>
        </div>
      )}
    </div>
  );
}
