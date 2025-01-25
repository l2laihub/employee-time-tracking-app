import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { TimeEntryProvider } from './contexts/TimeEntryContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { PTOProvider } from './contexts/PTOContext';
import AppRoutes from './components/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <BrandingProvider>
            <TimeEntryProvider>
              <EmployeeProvider>
                <PTOProvider>
                  <Toaster position="top-right" expand={true} richColors />
                  <AppRoutes />
                </PTOProvider>
              </EmployeeProvider>
            </TimeEntryProvider>
          </BrandingProvider>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
