import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TimeEntryProvider } from './contexts/TimeEntryContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { PTOProvider } from './contexts/PTOContext';
import AppRoutes from './components/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TimeEntryProvider>
          <EmployeeProvider>
            <PTOProvider>
              <Toaster position="top-right" />
              <AppRoutes />
            </PTOProvider>
          </EmployeeProvider>
        </TimeEntryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
