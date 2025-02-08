import React from 'react';
import { format, parseISO } from 'date-fns';
import { FileText, Check, X, Clock, User } from 'lucide-react';
import type { Timesheet } from '../../types/custom.types';
import { useEmployees } from '../../contexts/EmployeeContext';

interface TimesheetListProps {
  timesheets: Timesheet[];
  onViewTimesheet: (timesheet: Timesheet) => void;
  isAdmin: boolean;
}

export default function TimesheetList({ timesheets, onViewTimesheet, isAdmin }: TimesheetListProps) {
  const { employees } = useEmployees();

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'MMM d, yyyy');
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'MMM d, yyyy h:mm a');
  };

  const getStatusIcon = (status: Timesheet['status']) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status: Timesheet['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmployeeName = (timesheet: Timesheet) => {
    console.log('Getting employee name for timesheet:', timesheet);
    
    // First try to get from nested employee data
    if (timesheet.employee?.first_name && timesheet.employee?.last_name) {
      const name = `${timesheet.employee.first_name} ${timesheet.employee.last_name}`;
      console.log('Found employee name from nested data:', name);
      return name;
    }
    
    // Fallback to employees context
    console.log('Falling back to employees context. Available employees:', employees);
    const employee = employees?.find(emp => emp.id === timesheet.employee_id);
    const name = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
    console.log('Found employee name from context:', name);
    return name;
  };

  const getDepartment = (timesheet: Timesheet) => {
    console.log('Getting department for timesheet:', timesheet);
    
    // First try to get from nested employee data
    if (timesheet.employee?.department) {
      console.log('Found department from nested data:', timesheet.employee.department);
      return timesheet.employee.department;
    }
    
    // Fallback to employees context
    console.log('Falling back to employees context');
    const employee = employees?.find(emp => emp.id === timesheet.employee_id);
    const department = employee?.department || 'N/A';
    console.log('Found department from context:', department);
    return department;
  };

  if (!employees || employees.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading employees...</p>
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No timesheets found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? 'No timesheets match your current filters.' : 'You haven\'t submitted any timesheets yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timesheets.map((timesheet) => {
        const employeeName = getEmployeeName(timesheet);
        const department = getDepartment(timesheet);

        return (
          <div
            key={timesheet.id}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {getStatusIcon(timesheet.status)}
                <div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">{employeeName}</span>
                        <span className="text-sm text-gray-500 ml-2">({department})</span>
                      </div>
                    </div>
                  )}
                  <h3 className="font-medium text-gray-700">
                    Period: {formatDate(timesheet.period_start_date)} - {formatDate(timesheet.period_end_date)}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-500">
                      Total Hours: <span className="font-medium">{timesheet.total_hours}</span>
                    </p>
                    {timesheet.submitted_at && (
                      <p className="text-xs text-gray-500">
                        Submitted: {formatDateTime(timesheet.submitted_at)}
                      </p>
                    )}
                    {timesheet.reviewed_at && (
                      <p className="text-xs text-gray-500">
                        Reviewed: {formatDateTime(timesheet.reviewed_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(timesheet.status)}`}>
                  {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                </span>
                <button
                  onClick={() => onViewTimesheet(timesheet)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}