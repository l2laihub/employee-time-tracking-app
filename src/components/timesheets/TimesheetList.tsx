import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { FileText, Check, X, Clock, User, ChevronUp, ChevronDown } from 'lucide-react';
import type { Timesheet } from '../../types/custom.types';
import { useEmployees } from '../../contexts/EmployeeContext';

interface TimesheetListProps {
  timesheets: Timesheet[];
  onViewTimesheet: (timesheet: Timesheet) => void;
  isAdmin: boolean;
}

type SortField = 'period' | 'employee' | 'status' | 'totalHours';
type SortDirection = 'asc' | 'desc';

export default function TimesheetList({ timesheets, onViewTimesheet, isAdmin }: TimesheetListProps) {
  const { employees } = useEmployees();
  const [sortField, setSortField] = useState<SortField>('period');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
    if (timesheet.employee?.first_name && timesheet.employee?.last_name) {
      return `${timesheet.employee.first_name} ${timesheet.employee.last_name}`;
    }
    
    const employee = employees?.find(emp => emp.id === timesheet.employee_id);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };

  const getDepartment = (timesheet: Timesheet) => {
    if (timesheet.employee?.department) {
      return timesheet.employee.department;
    }
    
    const employee = employees?.find(emp => emp.id === timesheet.employee_id);
    return employee?.department || 'N/A';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const sortedTimesheets = useMemo(() => {
    return [...timesheets].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'period':
          return multiplier * (new Date(a.period_start_date).getTime() - new Date(b.period_start_date).getTime());
        case 'employee':
          return multiplier * getEmployeeName(a).localeCompare(getEmployeeName(b));
        case 'status':
          return multiplier * a.status.localeCompare(b.status);
        case 'totalHours':
          return multiplier * ((a.total_hours || 0) - (b.total_hours || 0));
        default:
          return 0;
      }
    });
  }, [timesheets, sortField, sortDirection]);

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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {isAdmin && (
              <th scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('employee')}>
                <div className="flex items-center space-x-1">
                  <span>Employee</span>
                  {getSortIcon('employee')}
                </div>
              </th>
            )}
            <th scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('period')}>
              <div className="flex items-center space-x-1">
                <span>Period</span>
                {getSortIcon('period')}
              </div>
            </th>
            <th scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('totalHours')}>
              <div className="flex items-center space-x-1">
                <span>Total Hours</span>
                {getSortIcon('totalHours')}
              </div>
            </th>
            <th scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('status')}>
              <div className="flex items-center space-x-1">
                <span>Status</span>
                {getSortIcon('status')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTimesheets.map((timesheet) => {
            const employeeName = getEmployeeName(timesheet);
            const department = getDepartment(timesheet);

            return (
              <tr key={timesheet.id} className="hover:bg-gray-50">
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employeeName}</div>
                        <div className="text-sm text-gray-500">{department}</div>
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(timesheet.period_start_date)} - {formatDate(timesheet.period_end_date)}
                  </div>
                  {timesheet.submitted_at && (
                    <div className="text-xs text-gray-500">
                      Submitted: {formatDateTime(timesheet.submitted_at)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{timesheet.total_hours}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(timesheet.status)}
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusClass(timesheet.status)}`}>
                      {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onViewTimesheet(timesheet)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}