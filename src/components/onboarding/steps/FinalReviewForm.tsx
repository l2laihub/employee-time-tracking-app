import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { Industry, OrganizationSize, ValidationError } from '../types';

interface FinalReviewFormProps {
  onSubmit: () => Promise<void>;
  onBack: () => void;
  error?: string | null;
  isSubmitting?: boolean;
  setError?: (error: string | null) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const FinalReviewForm: React.FC<FinalReviewFormProps> = ({ 
  onSubmit, 
  onBack, 
  error: externalError, 
  isSubmitting: externalIsSubmitting,
  setError: setExternalError
}) => {
  const { state, setValidationErrors, setValidationWarnings } = useOnboarding();
  const [localError, setLocalError] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });

  const error = externalError || localError;
  const isSubmitting = externalIsSubmitting;

  const { organization, admin, team } = state;

  // Validate the form data when component mounts or when data changes
  useEffect(() => {
    validateOnboardingData();
  }, [organization, admin, team]);

  const getIndustryLabel = (industry: Industry | undefined) => {
    if (!industry) return 'Not specified';
    
    const labels: Record<Industry, string> = {
      [Industry.TECHNOLOGY]: 'Technology',
      [Industry.HEALTHCARE]: 'Healthcare',
      [Industry.RETAIL]: 'Retail',
      [Industry.CONTRACTING]: 'Contracting',
      [Industry.CONSTRUCTION]: 'Construction',
      [Industry.CONSULTING]: 'Consulting',
      [Industry.EDUCATION]: 'Education',
      [Industry.FINANCE]: 'Finance',
      [Industry.HOSPITALITY]: 'Hospitality',
      [Industry.LEGAL]: 'Legal',
      [Industry.MANUFACTURING]: 'Manufacturing',
      [Industry.NONPROFIT]: 'Non-Profit',
      [Industry.PROFESSIONAL_SERVICES]: 'Professional Services',
      [Industry.TRANSPORTATION]: 'Transportation',
      [Industry.OTHER]: 'Other'
    };
    
    return labels[industry] || 'Not specified';
  };

  const getSizeLabel = (size: OrganizationSize | undefined) => {
    if (!size) return 'Not specified';
    
    const labels: Record<OrganizationSize, string> = {
      [OrganizationSize.SMALL]: '1-10 employees',
      [OrganizationSize.MEDIUM]: '11-50 employees',
      [OrganizationSize.LARGE]: '51+ employees'
    };
    
    return labels[size] || 'Not specified';
  };

  const validateOnboardingData = (): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Validate organization data
    if (!organization?.name) {
      errors.push({
        field: 'organization.name',
        message: 'Organization name is required'
      });
    }
    
    if (!organization?.industry) {
      warnings.push({
        field: 'organization.industry',
        message: 'Industry is not specified'
      });
    }
    
    if (!organization?.size) {
      warnings.push({
        field: 'organization.size',
        message: 'Organization size is not specified'
      });
    }
    
    // Validate admin account data
    if (!admin?.email) {
      errors.push({
        field: 'admin.email',
        message: 'Admin email is required'
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
      errors.push({
        field: 'admin.email',
        message: 'Admin email is invalid'
      });
    }
    
    if (!admin?.password) {
      errors.push({
        field: 'admin.password',
        message: 'Admin password is required'
      });
    } else if (admin.password.length < 8) {
      errors.push({
        field: 'admin.password',
        message: 'Password must be at least 8 characters'
      });
    }
    
    if (!admin?.firstName) {
      errors.push({
        field: 'admin.firstName',
        message: 'Admin first name is required'
      });
    }
    
    if (!admin?.lastName) {
      errors.push({
        field: 'admin.lastName',
        message: 'Admin last name is required'
      });
    }
    
    // Validate team configuration
    if (team?.departments && team.departments.length === 0) {
      warnings.push({
        field: 'team.departments',
        message: 'No departments specified, defaults will be used'
      });
    }
    
    if (team?.serviceTypes && team.serviceTypes.length === 0) {
      warnings.push({
        field: 'team.serviceTypes',
        message: 'No service types specified, defaults will be used'
      });
    }
    
    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
    // Update state with validation results
    setValidationResult(result);
    
    // Update context with validation results
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    try {
      // Validate the form data
      const { isValid, errors } = validateOnboardingData();
      
      if (!isValid) {
        const errorMessage = errors.map(err => err.message).join(', ');
        throw new Error(`Please correct the following errors: ${errorMessage}`);
      }
      
      // Submit the form
      await onSubmit();
    } catch (err) {
      console.error('Error in final review submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during submission';
      
      // Set the error message locally
      setLocalError(errorMessage);
      
      // Also propagate to parent if needed
      if (setExternalError) {
        setExternalError(errorMessage);
      }
    }
  };

  if (isSubmitting) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Setting up your account...
        </h2>
        <p className="text-gray-600 mb-8">
          Please wait while we create your account and organization.
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Check if team has departments or service types with length > 0
  const hasDepartments = team?.departments && team.departments.length > 0;
  const hasServiceTypes = team?.serviceTypes && team.serviceTypes.length > 0;
  const hasTeamConfig = hasDepartments || hasServiceTypes;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Review Your Information
      </h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {validationResult.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Attention needed</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900">{organization?.name || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Industry</dt>
              <dd className="text-sm text-gray-900">{getIndustryLabel(organization?.industry)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Size</dt>
              <dd className="text-sm text-gray-900">{getSizeLabel(organization?.size)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="text-sm text-gray-900">{organization?.website || 'Not specified'}</dd>
            </div>
          </dl>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Account</h3>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900">{admin?.firstName} {admin?.lastName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900">{admin?.email}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      {hasTeamConfig && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasDepartments && team?.departments && (
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Departments</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {team.departments.map((dept, index) => (
                    <li key={index}>{typeof dept === 'string' ? dept : dept.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {hasServiceTypes && team?.serviceTypes && (
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Service Types</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {team.serviceTypes.map((type, index) => (
                    <li key={index}>{typeof type === 'string' ? type : type.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Go back to previous step"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !validationResult.isValid}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            validationResult.isValid 
              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
              : 'bg-gray-400 cursor-not-allowed'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
          aria-label="Create account and organization"
        >
          Create Account
        </button>
      </div>
    </div>
  );
};

export default FinalReviewForm;
