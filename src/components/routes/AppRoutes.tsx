import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import TimeEntry from '../../pages/TimeEntry';
import JobLocations from '../../pages/JobLocations';
import Employees from '../../pages/Employees';
import Timesheets from '../../pages/Timesheets';
import Reports from '../../pages/Reports';
import PTO from '../../pages/PTO';
import Layout from '../Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import CreateOrganization from '../../pages/CreateOrganization';
import OrganizationInvites from '../../pages/OrganizationInvites';
import AcceptInvite from '../../pages/AcceptInvite';
import Login from '../../pages/Login';
import Signup from '../../pages/Signup';
import OrganizationSettings from '../../pages/OrganizationSettings';
import UserSettings from '../../pages/UserSettings';

export default function AppRoutes() {
  const { user } = useAuth();
  const { organization, userRole, isLoading } = useOrganization();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Public routes when not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/accept-invite/:inviteId" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Show create organization page if no organization exists
  if (!organization) {
    return <CreateOrganization />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/time-entry" element={<TimeEntry />} />
        <Route path="/job-locations" element={<JobLocations />} />
        {isAdmin && <Route path="/employees" element={<Employees />} />}
        <Route path="/timesheets" element={<Timesheets />} />
        {isAdmin && <Route path="/reports" element={<Reports />} />}
        <Route path="/pto" element={<PTO />} />
        {isAdmin && (
          <>
            <Route path="/admin/settings" element={<OrganizationSettings />} />
            <Route path="/admin/invites" element={<OrganizationInvites />} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
