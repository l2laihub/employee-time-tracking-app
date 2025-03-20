import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { hasPendingOnboarding, processOnboarding, clearOnboardingState } from '../../utils/processOnboarding';
import LoadingSpinner from '../common/LoadingSpinner';
import { supabase } from '../../lib/supabase';

// Processing steps for better user feedback
type ProcessingStep = 
  | 'checking' 
  | 'creating_organization' 
  | 'creating_departments' 
  | 'creating_service_types' 
  | 'finalizing';

const FirstLoginHandler: React.FC = () => {
  const { user } = useAuth();
  const { refreshOrganization } = useOrganization();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('checking');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Map processing steps to user-friendly messages
  const stepMessages: Record<ProcessingStep, string> = {
    checking: 'Checking your account status...',
    creating_organization: 'Creating your organization...',
    creating_departments: 'Setting up departments...',
    creating_service_types: 'Configuring service types...',
    finalizing: 'Finalizing your setup...'
  };

  // Function to retry the onboarding process
  const retryProcessing = useCallback(async () => {
    if (!user) return;
    
    setError(null);
    setIsProcessing(true);
    setCurrentStep('checking');
    setProcessingProgress(0);
    
    try {
      console.log('Retrying onboarding process for user:', user.id);
      const result = await processOnboarding(user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during onboarding');
      }
      
      console.log('Onboarding completed successfully on retry:', result);
      setIsComplete(true);
      
      // Refresh the organization context to reflect the new organization
      refreshOrganization();
      
      // Force a full page reload to ensure all contexts are properly updated
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      console.error('Error retrying onboarding process:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsProcessing(false);
    }
  }, [user, refreshOrganization]);

  useEffect(() => {
    const checkAndProcessOnboarding = async () => {
      // Only proceed if user is authenticated
      if (!user) {
        navigate('/dashboard');
        return;
      }

      setCurrentStep('checking');
      setProcessingProgress(10);

      // Check if the user already has an organization
      try {
        const { data: existingMemberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id);
        
        if (membershipError) {
          console.error('Error checking existing memberships:', membershipError);
          setError('Failed to check existing memberships. Please try again later.');
          return;
        }
        
        // Check if there are any valid memberships
        const validMemberships = existingMemberships?.filter(m => m.organization_id) || [];
        
        if (validMemberships.length > 0) {
          // User already has an organization, clear onboarding state and redirect
          console.log('User already has an organization, skipping onboarding process');
          clearOnboardingState();
          
          // Refresh organization context to ensure it's up to date
          await refreshOrganization();
          
          // Redirect to dashboard
          navigate('/dashboard');
          return;
        }

        setProcessingProgress(20);
      } catch (err) {
        console.error('Error checking organization memberships:', err);
        setError('Failed to check your organization status. Please try again later.');
        return;
      }

      // If we get here, user doesn't have an organization
      if (hasPendingOnboarding()) {
        // Process pending onboarding data
        setIsProcessing(true);
        setError(null);

        try {
          console.log('Processing onboarding for user:', user.id);
          
          // Start the onboarding process
          setCurrentStep('creating_organization');
          setProcessingProgress(30);
          
          const result = await processOnboarding(user.id);
          
          // Update progress based on the step returned from processOnboarding
          if (result.step) {
            switch (result.step) {
              case 'creating_departments':
                setCurrentStep('creating_departments');
                setProcessingProgress(50);
                break;
              case 'creating_service_types':
                setCurrentStep('creating_service_types');
                setProcessingProgress(70);
                break;
              case 'completed':
                setCurrentStep('finalizing');
                setProcessingProgress(90);
                break;
            }
          }
          
          if (!result.success) {
            throw new Error(result.error || 'Unknown error during onboarding');
          }
          
          console.log('Onboarding completed successfully:', result);
          setIsComplete(true);
          setProcessingProgress(100);
          
          // Refresh the organization context to reflect the new organization
          await refreshOrganization();
          
          // Force a full page reload to ensure all contexts are properly updated
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } catch (err) {
          console.error('Error processing onboarding:', err);
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          // Don't clear onboarding state on error so the user can try again
          setIsProcessing(false);
        }
      } else {
        // No pending onboarding, redirect to create organization page
        navigate('/create-organization');
      }
    };

    checkAndProcessOnboarding();
  }, [user, navigate, refreshOrganization]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Setup Error
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We encountered an error while setting up your organization.
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={retryProcessing}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Try again"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/login')}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Return to login"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {isProcessing ? (
          <>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Setting Up Your Organization
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {stepMessages[currentStep]}
            </p>
            
            {/* Progress bar */}
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2.5" 
                 role="progressbar" 
                 aria-valuenow={processingProgress} 
                 aria-valuemin={0} 
                 aria-valuemax={100}>
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${processingProgress}%` }}>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <LoadingSpinner size="large" />
            </div>
          </>
        ) : isComplete ? (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-3 text-lg font-medium text-gray-900">Setup Complete!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your organization has been created successfully. Redirecting you to the dashboard...
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default FirstLoginHandler;
