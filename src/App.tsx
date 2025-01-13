import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TimeEntryProvider } from './contexts/TimeEntryContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import AppRoutes from './components/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TimeEntryProvider>
          <EmployeeProvider>
            <Toaster position="top-right" />
            <AppRoutes />
          </EmployeeProvider>
        </TimeEntryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
