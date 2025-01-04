import React from 'react';
import { format } from 'date-fns';
import { FileText, Check, X, Clock } from 'lucide-react';
import type { TimesheetEntry } from '../../lib/types';

interface TimesheetListProps {
  timesheets: TimesheetEntry[];
  onViewTimesheet: (timesheet: TimesheetEntry) => void;
}

export default function TimesheetList({ timesheets, onViewTimesheet }: TimesheetListProps) {
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

  return (
    <div className="space-y-4">
      {timesheets.map((timesheet) => (
        <div
          key={timesheet.id}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(timesheet.status)}
              <div>
                <h3 className="font-medium">
                  Week of {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
                </h3>
                <p className="text-sm text-gray-500">
                  Total Hours: {timesheet.totalHours}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(timesheet.status)}`}>
                {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
              </span>
              <button
                onClick={() => onViewTimesheet(timesheet)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}