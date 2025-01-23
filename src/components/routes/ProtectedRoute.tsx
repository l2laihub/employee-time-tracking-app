import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import LoadingSpinner from '../LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrg?: boolean;
}

export default function ProtectedRoute({ children, requireOrg = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();

  // Show loading spinner while checking auth or org status
  if (authLoading || (requireOrg && orgLoading)) {
    return <LoadingSpinner />;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If org is required but not present, redirect to select org
  if (requireOrg && !organization) {
    return <Navigate to="/select-organization" replace />;
  }

  return <>{children}</>;
}