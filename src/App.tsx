import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { TimeEntryProvider } from './contexts/TimeEntryContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { PTOProvider } from './contexts/PTOContext';
import { TimesheetProvider } from './contexts/TimesheetContext';
import { EmailProvider } from './contexts/EmailContext';
import { MigrationProvider } from './contexts/MigrationContext';
import AppRoutes from './components/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EmailProvider>
          <OrganizationProvider>
            <MigrationProvider>
              <SubscriptionProvider>
                <BrandingProvider>
                  <TimeEntryProvider>
                    <EmployeeProvider>
                      <TimesheetProvider>
                        <PTOProvider>
                          <Toaster
                            position="top-right"
                            expand={true}
                            richColors
                            duration={5000}
                          />
                          <AppRoutes />
                        </PTOProvider>
                      </TimesheetProvider>
                    </EmployeeProvider>
                  </TimeEntryProvider>
                </BrandingProvider>
              </SubscriptionProvider>
            </MigrationProvider>
          </OrganizationProvider>
        </EmailProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
