import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import Layout from '../Layout';
import Dashboard from '../../pages/Dashboard';
import UserSettings from '../../pages/UserSettings';
import TimeEntry from '../../pages/TimeEntry';
import JobLocations from '../../pages/JobLocations';
import Employees from '../../pages/Employees';
import Timesheets from '../../pages/Timesheets';
import Reports from '../../pages/Reports';
import PTO from '../../pages/PTO';
import OrganizationSettings from '../../pages/OrganizationSettings';
import OrganizationInvites from '../../pages/OrganizationInvites';
import SubscriptionManagement from '../../pages/SubscriptionManagement';
import Overview from '../../pages/Overview';
import Demo from '../../pages/Demo';
import Login from '../../pages/Login';
import Signup from '../../pages/Signup';
import AcceptInvite from '../../pages/AcceptInvite';
import CreateOrganization from '../../pages/CreateOrganization';
import Onboarding from '../../pages/Onboarding';

export default function AppRoutes() {
  const { user } = useAuth();
  const { organization, userRole, isLoading } = useOrganization();
  const location = useLocation();
  const isAdmin = userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Overview />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/accept-invite/:inviteId" element={<AcceptInvite />} />

      {/* Protected Routes */}
      {user ? (
        !organization ? (
          // No organization - show create org
          <>
            <Route path="/create-organization" element={<CreateOrganization />} />
            <Route path="*" element={<Navigate to="/create-organization" replace />} />
          </>
        ) : (
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
                  <Route path="/admin/subscription" element={<SubscriptionManagement />} />
                </>
              )}
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )
      ) : (
        // Not logged in - redirect to login except for public routes
        <Route
          path="*"
          element={
            !location.pathname.match(/^\/(login|signup|onboarding|demo|accept-invite|)$/) ? (
              <Navigate to={`/login?redirect=${location.pathname}`} replace />
            ) : null
          }
        />
      )}
    </Routes>
  );
}
