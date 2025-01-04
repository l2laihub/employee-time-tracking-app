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
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { useAuth } from '../../contexts/AuthContext';

export default function AppRoutes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Routes>
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
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="time-entry" element={<TimeEntry />} />
        <Route path="pto" element={<PTO />} />
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
    </Routes>
  );
}