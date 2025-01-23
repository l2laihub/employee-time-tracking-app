import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  if (!user) return null;

  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}