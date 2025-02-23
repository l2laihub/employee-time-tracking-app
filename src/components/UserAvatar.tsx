import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import * as employeeService from '../services/employees';

interface UserAvatarProps {
  className?: string;
}

export default function UserAvatar({ className = '' }: UserAvatarProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployeePhoto() {
      if (!user?.email || !organization?.id) return;

      const result = await employeeService.getEmployeeByEmail(user.email, organization.id);
      if (result.success && result.data) {
        const employee = Array.isArray(result.data) ? result.data[0] : result.data;
        setPhotoUrl(employee.photo_url || null);
      }
    }

    fetchEmployeePhoto();

    // Listen for employee updates
    const handleEmployeeUpdate = () => {
      console.log('Employee update detected, refreshing avatar');
      fetchEmployeePhoto();
    };

    window.addEventListener('employee-updated', handleEmployeeUpdate);

    return () => {
      window.removeEventListener('employee-updated', handleEmployeeUpdate);
    };
  }, [user?.email, organization?.id]);

  return (
    <img
      className={`h-8 w-8 rounded-full ring-2 ring-neutral-100 ${className}`}
      src={photoUrl || `https://ui-avatars.com/api/?name=${user?.email}`}
      alt=""
    />
  );
}