import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { AdminAccount } from '../types';

interface AdminAccountFormProps {
  onSubmit: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  setError?: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminAccountForm: React.FC<AdminAccountFormProps> = ({ 
  onSubmit,
  error: externalError,
  isSubmitting: externalIsSubmitting,
  setError: setExternalError,
  setIsSubmitting: setExternalIsSubmitting
}) => {
  const { state, updateAdmin, completeStep } = useOnboarding();
  const [formData, setFormData] = useState<Partial<AdminAccount>>({
    firstName: state.admin.firstName || '',
    lastName: state.admin.lastName || '',
    email: state.admin.email || '',
    password: '',
    role: 'admin'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Use external state if provided
  const isSubmitting = externalIsSubmitting || false;
  const displayError = externalError || null;

  // Update context whenever form data changes
  useEffect(() => {
    console.log('Updating admin data in context:', formData);
    updateAdmin(formData);
  }, [formData, updateAdmin]);

  const validatePassword = (password: string) => {
    const passwordRequirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    return {
      isValid: Object.values(passwordRequirements).every(Boolean),
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Validate password as user types
    if (name === 'password') {
      const { isValid } = validatePassword(value);
      if (!isValid) {
        setErrors(prev => ({
          ...prev,
          password: 'Password must meet all requirements'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          password: ''
        }));
      }
    }
  };

  const handleExternalError = (message: string) => {
    if (setExternalError) {
      setExternalError(message);
    }
  };

  const handleExternalSubmitting = (submitting: boolean) => {
    if (setExternalIsSubmitting) {
      setExternalIsSubmitting(submitting);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const { isValid } = validatePassword(formData.password);
      if (!isValid) {
        newErrors.password = 'Password does not meet requirements';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Also set external error if provided
      handleExternalError('Please correct the errors in the form');
      return;
    }
    
    // Clear errors
    setErrors({});
    if (setExternalError) {
      setExternalError(null);
    }
    
    // Set submitting state
    handleExternalSubmitting(true);
    
    // Update admin data in context
    updateAdmin(formData);
    
    // Mark step as complete
    completeStep('admin');
    
    // Call onSubmit callback
    onSubmit();
    
    // Reset submitting state
    handleExternalSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Create Admin Account
      </h2>

      {/* Display external error if provided */}
      {displayError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Name */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              errors.firstName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              errors.lastName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              errors.email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              errors.password
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          
          {/* Password Requirements */}
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-500">Password must contain:</p>
            <ul className="text-xs text-gray-500 list-disc list-inside">
              <li>At least 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAccountForm;