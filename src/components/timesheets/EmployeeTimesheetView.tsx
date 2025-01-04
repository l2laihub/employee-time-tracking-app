import React, { useState } from 'react';
import { TimesheetEntry } from '../../lib/types';
import TimesheetList from './TimesheetList';
import TimesheetForm from './TimesheetForm';

interface EmployeeTimesheetViewProps {
  timesheets: TimesheetEntry[];
  userId: string;
  onUpdateTimesheet: (timesheet: TimesheetEntry) => void;
}

export default function EmployeeTimesheetView({ 
  timesheets, 
  userId,
  onUpdateTimesheet 
}: EmployeeTimesheetViewProps) {
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);

  const userTimesheets = timesheets.filter(t => t.userId === userId);

  const handleSubmitTimesheet = (updatedTimesheet: TimesheetEntry) => {
    onUpdateTimesheet(updatedTimesheet);
    setSelectedTimesheet(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Timesheets</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and submit your weekly timesheets
        </p>
      </div>

      {selectedTimesheet ? (
        <TimesheetForm
          timesheet={selectedTimesheet}
          onSubmit={handleSubmitTimesheet}
          onCancel={() => setSelectedTimesheet(null)}
        />
      ) : (
        <TimesheetList
          timesheets={userTimesheets}
          onViewTimesheet={setSelectedTimesheet}
          isAdmin={false}
        />
      )}
    </div>
  );
}