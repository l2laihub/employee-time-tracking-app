import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TimeEntryProvider } from './contexts/TimeEntryContext';
import AppRoutes from './components/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TimeEntryProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </TimeEntryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
