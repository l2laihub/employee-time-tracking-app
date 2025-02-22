import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import OnboardingContainer from '../components/onboarding/OnboardingContainer';
import WelcomeScreen from '../components/onboarding/steps/WelcomeScreen';
import OrganizationForm from '../components/onboarding/steps/OrganizationForm';
import AdminAccountForm from '../components/onboarding/steps/AdminAccountForm';
import TeamConfigurationForm from '../components/onboarding/steps/TeamConfigurationForm';
import ErrorDisplay from '../components/onboarding/ErrorDisplay';
import LoadingState from '../components/onboarding/LoadingState';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';
import { getOnboardingState } from '../utils/onboardingStorage';

type LoadingStepType = 'creating-account' | 'establishing-auth' | 'refreshing-session' | 'creating-organization';

const OnboardingContent: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { createOrganization } = useOrganization();
  const {
    state: { currentStep, steps, organization, admin },
    nextStep,
    previousStep,
    setStep,
    completeStep,
    completeOnboarding,
    updateTeam,
    resetOnboarding
  } = useOnboarding();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStepType>('creating-account');

  // Only reset onboarding if there's no saved state or previous onboarding was completed
  useEffect(() => {
    const savedState = getOnboardingState();
    if (!savedState || savedState.completed) {
      resetOnboarding();
    }
  }, [resetOnboarding]);

  const handleSave = useCallback(async () => {
    try {
      // Auto-save is handled by the context
      return Promise.resolve();
    } catch (err) {
      setError('Failed to save progress. Please try again.');
    }
  }, []);

  const handleGetStarted = useCallback(() => {
    setError(null);
    
    // Find the index of the organization step
    const organizationStepIndex = steps.findIndex(step => step.id === 'organization');
    if (organizationStepIndex === -1) {
      console.error('Organization step not found');
      return;
    }

    // Complete welcome step and move to organization step
    completeStep('welcome');
    setStep(organizationStepIndex);
  }, [completeStep, setStep, steps]);

  const handleOrganizationSubmit = useCallback(() => {
    setError(null);
    
    // Find the index of the admin step
    const adminStepIndex = steps.findIndex(step => step.id === 'admin');
    if (adminStepIndex === -1) {
      console.error('Admin step not found');
      return;
    }

    // Complete organization step and move to admin step
    completeStep('organization');
    setStep(adminStepIndex);
  }, [completeStep, setStep, steps]);

  const refreshSession = async (): Promise<string> => {
    setLoadingStep('refreshing-session');
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error || !session?.user?.id) {
      throw new Error('Failed to refresh session');
    }
    return session.user.id;
  };

  const waitForAuthentication = async (): Promise<string> => {
    setLoadingStep('establishing-auth');
    return new Promise((resolve, reject) => {
      // Set a timeout to reject if it takes too long
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      // First check if we already have a session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          console.log('Existing session found:', session.user.id);
          clearTimeout(timeout);
          resolve(session.user.id);
          return;
        }
      });

      // Listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', { event, userId: session?.user?.id });
        
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.id) {
          console.log('Valid auth event received:', { event, userId: session.user.id });
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session.user.id);
        }
      });
    });
  };

  const handleAdminSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    setLoadingStep('creating-account');

    try {
      console.log('Starting admin account creation process...');

      if (!organization.name) {
        throw new Error('Organization name is required');
      }

      if (!admin.firstName || !admin.lastName || !admin.email || !admin.password) {
        console.log('Missing admin fields:', {
          firstName: !admin.firstName,
          lastName: !admin.lastName,
          email: !admin.email,
          password: !admin.password
        });
        throw new Error('Please fill in all admin account fields');
      }

      // First create the user account
      console.log('Creating user account...');
      const { error: signUpError } = await signUp(
        admin.email,
        admin.password,
        admin.firstName,
        admin.lastName
      );

      if (signUpError) {
        throw signUpError;
      }

      // Wait for authentication to be established
      console.log('Waiting for authentication to be established...');
      await waitForAuthentication();

      // Refresh the session to ensure we have the latest token
      console.log('Refreshing session...');
      await refreshSession();
      console.log('Session refreshed successfully');

      // Small delay to ensure token propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then create the organization
      setLoadingStep('creating-organization');
      console.log('Creating organization...');
      await createOrganization(organization.name);
      console.log('Organization created successfully');

      // Find the index of the team step
      const teamStepIndex = steps.findIndex(step => step.id === 'team');
      if (teamStepIndex === -1) {
        console.error('Team step not found');
        return;
      }

      // Complete admin step and move to team step
      completeStep('admin');
      setStep(teamStepIndex);
    } catch (err) {
      console.error('Error during onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  }, [organization, admin, signUp, createOrganization, completeStep, nextStep]);

  const handleTeamSubmit = useCallback(() => {
    setError(null);
    
    // Find the index of the complete step
    const completeStepIndex = steps.findIndex(step => step.id === 'complete');
    if (completeStepIndex === -1) {
      console.error('Complete step not found');
      return;
    }

    // Complete team step and move to complete step
    completeStep('team');
    setStep(completeStepIndex);
  }, [completeStep, setStep, steps]);

  const handleFinishOnboarding = useCallback(() => {
    completeOnboarding();
    navigate('/dashboard');
  }, [completeOnboarding, navigate]);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  const renderCurrentStep = () => {
    // Show error if present
    if (error) {
      return (
        <>
          <ErrorDisplay error={error} onRetry={handleRetry} />
          {renderStepContent()}
        </>
      );
    }

    return renderStepContent();
  };

  const renderStepContent = () => {
    // Validate steps array and current step index
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      console.error('Invalid steps array:', steps);
      return null;
    }

    if (currentStep < 0 || currentStep >= steps.length) {
      console.error('Invalid current step:', { currentStep, stepsLength: steps.length });
      return null;
    }

    const currentStepId = steps[currentStep].id;
    console.log('Rendering step:', {
      currentStep,
      currentStepId,
      stepData: steps[currentStep],
      allSteps: steps.map(s => ({ id: s.id, completed: s.completed, current: s.current }))
    });

    switch (currentStepId) {
      case 'welcome':
        return (
          <WelcomeScreen
            valuePropositions={[
              'Streamline your workforce management',
              'Automate time tracking and reporting',
              'Simplify PTO management',
              'Get insights into team productivity'
            ]}
            onGetStarted={handleGetStarted}
          />
        );
      case 'organization':
        return (
          <OrganizationForm
            onSubmit={handleOrganizationSubmit}
          />
        );
      case 'admin':
        return (
          <AdminAccountForm
            onSubmit={handleAdminSubmit}
          />
        );
      case 'team':
        return (
          <TeamConfigurationForm
            onSubmit={handleTeamSubmit}
          />
        );
      case 'complete':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Complete!
            </h2>
            <p className="text-gray-600 mb-8">
              Your organization has been created successfully. You can now start using the platform.
            </p>
            <button
              onClick={handleFinishOnboarding}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        );
      default:
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Step {currentStep + 1}
            </h2>
            <p className="text-gray-500 mt-2">
              This step is under construction
            </p>
          </div>
        );
    }
  };

  // Show loading state during submission
  if (isSubmitting) {
    return <LoadingState step={loadingStep} />;
  }

  return (
    <OnboardingContainer
      currentStep={currentStep}
      totalSteps={steps.length}
      onNext={nextStep}
      onBack={previousStep}
      onSave={handleSave}
    >
      {renderCurrentStep()}
    </OnboardingContainer>
  );
};

const OnboardingPage: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};

export default OnboardingPage;