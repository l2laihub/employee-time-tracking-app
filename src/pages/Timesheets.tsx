import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import AdminTimesheetView from '../components/timesheets/AdminTimesheetView';
import EmployeeTimesheetView from '../components/timesheets/EmployeeTimesheetView';
import type { TimesheetEntry } from '../lib/types';
import { mockTimesheets } from '../lib/mockData';

export default function Timesheets() {
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [timesheets, setTimesheets] = useState(mockTimesheets);
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const handleUpdateTimesheet = (updatedTimesheet: TimesheetEntry) => {
    setTimesheets(current =>
      current.map(t => t.id === updatedTimesheet.id ? updatedTimesheet : t)
    );
  };

  if (!user) return null;

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