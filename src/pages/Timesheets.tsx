import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTimesheets } from '../contexts/TimesheetContext';
import AdminTimesheetView from '../components/timesheets/AdminTimesheetView';
import EmployeeTimesheetView from '../components/timesheets/EmployeeTimesheetView';

export default function Timesheets() {
  const { user } = useAuth();
  const { userRole, isLoading: orgLoading } = useOrganization();
  const { timesheets, refreshTimesheets, updateTimesheetStatus, isLoading: timesheetsLoading } = useTimesheets();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  // Refresh timesheets when component mounts or when user/role changes
  useEffect(() => {
    if (orgLoading) {
      console.log('Organization still loading, skipping refresh');
      return;
    }

    if (!userRole) {
      console.log('User role not available yet, skipping refresh');
      return;
    }

    console.log('Timesheets page mounted - refreshing timesheets. User role:', userRole);
    refreshTimesheets();
  }, [refreshTimesheets, user, userRole, orgLoading]);

  const handleUpdateTimesheet = async (timesheetId: string, status: string, reviewNotes?: string) => {
    await updateTimesheetStatus(timesheetId, status as any, reviewNotes);
    await refreshTimesheets();
  };

  if (!user) return null;

  if (orgLoading || timesheetsLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {isAdmin ? (
        <AdminTimesheetView
          timesheets={timesheets}
          onUpdateTimesheet={handleUpdateTimesheet}
        />
      ) : (
        <EmployeeTimesheetView
          timesheets={timesheets}
          userId={user.id}
          onUpdateTimesheet={handleUpdateTimesheet}
        />
      )}
    </div>
  );
}