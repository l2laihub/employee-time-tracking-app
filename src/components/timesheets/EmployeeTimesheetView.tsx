import React, { useState } from 'react';
import type { Timesheet } from '../../types/custom.types';
import TimesheetList from './TimesheetList';
import TimesheetReviewForm from './TimesheetReviewForm';

interface EmployeeTimesheetViewProps {
  timesheets: Timesheet[];
  onUpdateTimesheet: (timesheetId: string, status: string, reviewNotes?: string, totalHours?: number) => void;
  isAdmin?: boolean;
}

export default function EmployeeTimesheetView({ 
  timesheets, 
  onUpdateTimesheet,
  isAdmin = false
}: EmployeeTimesheetViewProps) {
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  // No need to filter by user ID anymore since the context already handles that
  const userTimesheets = timesheets;

  const handleSubmitTimesheet = async (status: string, reviewNotes?: string, timesheetData?: Timesheet) => {
    if (!selectedTimesheet) return;
    
    try {
      setIsLoading(true);
      setError(undefined);
      
      // Validate timesheet data
      if (!timesheetData?.total_hours || timesheetData.total_hours <= 0) {
        setError('Invalid total hours');
        setIsLoading(false);
        return;
      }
      
      console.log('Submitting timesheet:', { id: selectedTimesheet.id, status, reviewNotes, totalHours: timesheetData.total_hours });
      await onUpdateTimesheet(selectedTimesheet.id, status, reviewNotes, timesheetData.total_hours);
      console.log('Timesheet submitted successfully');
      setSelectedTimesheet(null); // Only clear selection on success
    } catch (err) {
      console.error('Error submitting timesheet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update timesheet';
      setError(errorMessage);
      // Don't re-throw - let error be displayed in the UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setError(undefined);
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
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {selectedTimesheet ? (
        <TimesheetReviewForm
          timesheet={selectedTimesheet}
          onSubmit={handleSubmitTimesheet}
          onClose={() => setSelectedTimesheet(null)}
          isAdmin={isAdmin}
        />
      ) : (
        <TimesheetList
          timesheets={userTimesheets}
          onViewTimesheet={handleViewTimesheet}
          isAdmin={isAdmin}
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
    </div>
  );
}
