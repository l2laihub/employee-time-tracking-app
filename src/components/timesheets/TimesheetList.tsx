import React from 'react';
import { format } from 'date-fns';
import { FileText, Check, X, Clock, User } from 'lucide-react';
import type { TimesheetEntry } from '../../lib/types';
import { mockUsers } from '../../lib/mockUsers';

interface TimesheetListProps {
  timesheets: TimesheetEntry[];
  onViewTimesheet: (timesheet: TimesheetEntry) => void;
  isAdmin: boolean;
}

export default function TimesheetList({ timesheets, onViewTimesheet, isAdmin }: TimesheetListProps) {
  const getStatusIcon = (status: TimesheetEntry['status']) => {
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

  const getStatusClass = (status: TimesheetEntry['status']) => {
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

  const getEmployeeName = (userId: string) => {
    const employee = mockUsers.find(user => user.id === userId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };

  const getDepartment = (userId: string) => {
    const employee = mockUsers.find(user => user.id === userId);
    return employee?.department || 'N/A';
  };

  return (
    <div className="space-y-4">
      {timesheets.map((timesheet) => {
        const employeeName = getEmployeeName(timesheet.userId);
        const department = getDepartment(timesheet.userId);

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
                    Week of {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-500">
                      Total Hours: <span className="font-medium">{timesheet.totalHours}</span>
                    </p>
                    {timesheet.submittedAt && (
                      <p className="text-xs text-gray-500">
                        Submitted: {format(new Date(timesheet.submittedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {timesheet.reviewedAt && (
                      <p className="text-xs text-gray-500">
                        Reviewed: {format(new Date(timesheet.reviewedAt), 'MMM d, yyyy h:mm a')}
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
                  className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-md transition-colors"
                >
                  {isAdmin ? 'Review Details' : 'View Details'}
                </button>
              </div>
            </div>
            {timesheet.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">{timesheet.notes}</p>
              </div>
            )}
          </div>
        );
      })}

      {timesheets.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No timesheets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'No timesheets match your current filters.' : 'You haven\'t submitted any timesheets yet.'}
          </p>
        </div>
      )}
    </div>
  );
}