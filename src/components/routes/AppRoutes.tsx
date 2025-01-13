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
import PTOBalances from '../../pages/PTOBalances';
import Login from '../../pages/Login';
import Signup from '../../pages/Signup';
import Overview from '../../pages/Overview';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { useAuth } from '../../contexts/AuthContext';

export default function AppRoutes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/overview" element={
        <PublicRoute>
          <Overview />
        </PublicRoute>
      } />
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

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="time-entry" element={<TimeEntry />} />
        <Route path="pto">
          <Route index element={<PTO />} />
          <Route 
            path="balances" 
            element={
              isAdmin ? (
                <PTOBalances />
              ) : (
                <Navigate to="/pto" replace />
              )
            } 
          />
        </Route>
        <Route 
          path="job-locations" 
          element={
            isAdmin ? (
              <JobLocations />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="employees" 
          element={
            isAdmin ? (
              <Employees />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="timesheets" element={<Timesheets />} />
        <Route 
          path="reports/*" 
          element={
            isAdmin ? (
              <Reports />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Route>

      {/* Redirect root to overview for non-authenticated users */}
      <Route path="*" element={
        user ? <Navigate to="/" replace /> : <Navigate to="/overview" replace />
      } />
    </Routes>
  );
}
