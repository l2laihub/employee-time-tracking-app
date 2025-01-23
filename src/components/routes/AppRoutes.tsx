import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../Layout';
import Dashboard from '../../pages/Dashboard';
import TimeEntry from '../../pages/TimeEntry';
import JobLocations from '../../pages/JobLocations';
import Employees from '../../pages/Employees';
import Timesheets from '../../pages/Timesheets';
import Reports from '../../pages/Reports';
import PTO from '../../pages/PTO';
import Login from '../../pages/Login';
import Signup from '../../pages/Signup';
import Overview from '../../pages/Overview';
import { SelectOrganization } from '../organization/SelectOrganization';
import OrganizationSettings from '../../pages/OrganizationSettings';
import ManageInvites from '../../pages/ManageInvites';
import { AcceptInvite } from '../organization/AcceptInvite';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';

export default function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading, userRole } = useOrganization();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  console.log('AppRoutes State:', {
    user: user?.id,
    authLoading,
    organization: organization?.id,
    orgLoading,
    userRole,
    currentPath: window.location.pathname
  });

  // Show loading state while checking auth or organization
  if (authLoading || orgLoading) {
    console.log('Loading state:', { authLoading, orgLoading });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Get current path
  const currentPath = window.location.pathname;
  const isPublicRoute = ['/overview', '/login', '/signup'].some(path => currentPath.startsWith(path));
  const isOrgRoute = ['/select-organization', '/accept-invite'].some(path => currentPath.startsWith(path));

  // If not logged in and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    console.log('Not logged in, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If logged in but no organization and not on org routes, redirect to select organization
  if (user && !organization && !orgLoading && !isPublicRoute && !isOrgRoute) {
    console.log('No organization, redirecting to select-organization');
    return <Navigate to="/select-organization" replace />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/overview" element={<Overview />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />
      <Route path="/accept-invite" element={
        <PublicRoute>
          <AcceptInvite />
        </PublicRoute>
      } />

      {/* Protected Routes - Require authentication */}
      <Route path="/select-organization" element={
        <ProtectedRoute>
          <SelectOrganization />
        </ProtectedRoute>
      } />

      {/* Protected Routes - Require both authentication and organization */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="time-entry" element={<TimeEntry />} />
        <Route path="pto" element={<PTO />} />
        {isAdmin && (
          <>
            <Route path="job-locations" element={<JobLocations />} />
            <Route path="employees" element={<Employees />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<OrganizationSettings />} />
            <Route path="invites" element={<ManageInvites />} />
          </>
        )}
        <Route path="timesheets" element={<Timesheets />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
