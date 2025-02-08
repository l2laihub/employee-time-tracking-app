import React, { useState, useEffect } from 'react';
import type { Timesheet } from '../../types/custom.types';
import TimesheetList from './TimesheetList';
import TimesheetForm from './TimesheetForm';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';

interface EmployeeTimesheetViewProps {
  timesheets: Timesheet[];
  onUpdateTimesheet: (timesheet: Timesheet) => void;
}

export default function EmployeeTimesheetView({ 
  timesheets, 
  onUpdateTimesheet 
}: EmployeeTimesheetViewProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  // No need to filter by user ID anymore since the context already handles that
  const userTimesheets = timesheets;

  const handleSubmitTimesheet = async (updatedTimesheet: Timesheet) => {
    try {
      onUpdateTimesheet(updatedTimesheet);
      setSelectedTimesheet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update timesheet');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Timesheets</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and submit your weekly timesheets
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

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