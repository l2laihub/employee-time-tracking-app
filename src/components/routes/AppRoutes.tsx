import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import TimeEntry from '../../pages/TimeEntry';
import Overview from '../../pages/Overview';
import Demo from '../../pages/Demo';
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
  const location = useLocation();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    console.log('AppRoutes: Current route info', {
      pathname: location.pathname,
      user: user?.email,
      isLoading,
      isInvitePath: location.pathname.startsWith('/accept-invite')
    });
  }, [location.pathname, user, isLoading]);

  // Show loading state
  if (isLoading) {
    console.log('AppRoutes: Loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Render routes based on authentication state
  console.log('AppRoutes: Rendering routes', {
    isAuthenticated: !!user,
    hasOrganization: !!organization,
    currentPath: location.pathname
  });

  return (
    <Routes>
      {user ? (
        // User is authenticated
        !organization ? (
          // No organization - show create org page
          <Route path="*" element={<CreateOrganization />} />
        ) : (
          // Has organization - show app routes
          <>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )
      ) : (
        // User is not authenticated - show public routes
        <>
          <Route path="/" element={<Overview />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-invite/:inviteId" element={<AcceptInvite />} />
          <Route
            path="*"
            element={
              location.pathname.startsWith('/accept-invite') ? null : (
                <Navigate to="/login" state={{ from: location }} replace />
              )
            }
          />
        </>
      )}
    </Routes>
  );
}
