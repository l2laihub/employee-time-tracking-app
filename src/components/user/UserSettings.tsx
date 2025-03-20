import React, { useState, useEffect, useCallback } from 'react';
import { useEmployees } from '../../contexts/EmployeeContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Employee } from '../../lib/types';
import * as employeeService from '../../services/employees';
import { Card, Input, Button, LoadingSpinner, ImageUpload } from '../design-system';
import { toast } from '../../lib/toast';

export default function UserSettings() {
  const { updateEmployee, refreshEmployees } = useEmployees();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  const refreshEmployeeData = useCallback(async () => {
    if (!user?.id || !organization) return;
    
    const result = await employeeService.getEmployeeByUserId(user.id, organization.id);
    if (result.success && result.data) {
      const employee = Array.isArray(result.data) ? result.data[0] : result.data;
      setCurrentEmployee(employee);
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || ''
      });
    }
  }, [user?.id, organization]);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        await refreshEmployeeData();
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load employee data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmployeeData();
  }, [refreshEmployeeData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = useCallback(async (file: File) => {
    if (!user?.id || !currentEmployee || isUploadingPhoto) return;
    
    setIsUploadingPhoto(true);
    try {
      console.log('Converting image to base64');
      
      // Check file size
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for base64
        throw new Error('File size must be less than 1MB');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG and PNG files are allowed');
      }
      
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      
      console.log('Image converted to base64 successfully');

      // Update employee record with base64 photo
      await updateEmployee(currentEmployee.id, {
        photo_url: base64
      });

      // Refresh data after successful update
      await refreshEmployeeData();
      
      // Use setTimeout to avoid the React state update during render warning
      setTimeout(() => {
        window.dispatchEvent(new Event('employee-updated'));
        
        toast({
          title: 'Success',
          description: 'Profile photo updated successfully'
        });
      }, 0);
    } catch (error) {
      console.error('Photo upload error:', error);
      
      // Use setTimeout to avoid the React state update during render warning
      setTimeout(() => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update profile photo',
          variant: 'destructive'
        });
      }, 0);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user?.id, currentEmployee, isUploadingPhoto, updateEmployee, refreshEmployeeData]);

  const handlePhotoRemove = useCallback(async () => {
    if (!user?.id || !currentEmployee || isUploadingPhoto || !currentEmployee.photo_url) return;

    setIsUploadingPhoto(true);
    try {
      console.log('Removing profile photo');
      
      // Just set photo_url to null, no need to delete from storage
      await updateEmployee(currentEmployee.id, {
        photo_url: null
      });

      // Refresh data after successful update
      await refreshEmployeeData();
      
      // Use setTimeout to avoid the React state update during render warning
      setTimeout(() => {
        window.dispatchEvent(new Event('employee-updated'));
        
        toast({
          title: 'Success',
          description: 'Profile photo removed successfully'
        });
      }, 0);
    } catch (error) {
      console.error('Photo remove error:', error);
      
      // Use setTimeout to avoid the React state update during render warning
      setTimeout(() => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to remove profile photo',
          variant: 'destructive'
        });
      }, 0);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user?.id, currentEmployee, isUploadingPhoto, updateEmployee, refreshEmployeeData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await updateEmployee(currentEmployee.id, {
        ...formData,
        photo_url: currentEmployee.photo_url // Include the photo_url in the update
      });
      await refreshEmployeeData();
      await refreshEmployees();
      
      toast({
        title: 'Success',
        description: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Failed to update user settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <Card className="p-6 text-center text-neutral-600">
        No employee profile found.
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-neutral-900 mb-6">
          Profile Settings
        </h1>

        <div className="mb-8">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">
            Profile Photo
          </h2>
          <ImageUpload
            value={currentEmployee?.photo_url || undefined}
            onChange={handlePhotoUpload}
            onRemove={handlePhotoRemove}
            isLoading={isUploadingPhoto}
            className="mb-4"
          />
          <p className="text-sm text-neutral-500">
            Upload a photo to personalize your profile. Max file size: 1MB.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="First Name"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              required
            />

            <Input
              label="Last Name"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              required
            />

            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />

            <Input
              label="Phone"
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          {/* Read-only Information */}
          <Card className="bg-neutral-50 border-neutral-100">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">
              Additional Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Department
                </label>
                <p className="mt-1 text-sm text-neutral-900">
                  {currentEmployee.department || 'Not assigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Role
                </label>
                <p className="mt-1 text-sm text-neutral-900">
                  {currentEmployee.role}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Start Date
                </label>
                <p className="mt-1 text-sm text-neutral-900">
                  {currentEmployee.start_date 
                    ? new Date(currentEmployee.start_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? <LoadingSpinner size="sm" /> : undefined}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
