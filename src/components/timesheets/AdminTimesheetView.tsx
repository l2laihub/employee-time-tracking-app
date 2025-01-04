import React, { useState } from 'react';
import { TimesheetEntry } from '../../lib/types';
import TimesheetList from './TimesheetList';
import TimesheetReviewForm from './TimesheetReviewForm';

interface AdminTimesheetViewProps {
  timesheets: TimesheetEntry[];
  onUpdateTimesheet: (timesheet: TimesheetEntry) => void;
}

export default function AdminTimesheetView({ timesheets, onUpdateTimesheet }: AdminTimesheetViewProps) {
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);

  const handleReviewTimesheet = (updatedTimesheet: TimesheetEntry) => {
    onUpdateTimesheet(updatedTimesheet);
    setSelectedTimesheet(null);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheet Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage employee timesheets
          </p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {selectedTimesheet ? (
        <TimesheetReviewForm
          timesheet={selectedTimesheet}
          onSubmit={handleReviewTimesheet}
          onCancel={() => setSelectedTimesheet(null)}
        />
      ) : (
        <TimesheetList
          timesheets={timesheets}
          onViewTimesheet={setSelectedTimesheet}
          isAdmin={true}
        />
      )}
    </div>
  );
}