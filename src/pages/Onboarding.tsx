import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OnboardingContainer from '../components/onboarding/OnboardingContainer';
import WelcomeScreen from '../components/onboarding/steps/WelcomeScreen';
import OrganizationForm from '../components/onboarding/steps/OrganizationForm';
import AdminAccountForm from '../components/onboarding/steps/AdminAccountForm';
import TeamConfigurationForm from '../components/onboarding/steps/TeamConfigurationForm';
import FinalReviewForm from '../components/onboarding/steps/FinalReviewForm';
import ErrorDisplay from '../components/onboarding/ErrorDisplay';
import LoadingState from '../components/onboarding/LoadingState';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { getOnboardingState } from '../utils/onboardingStorage';

type LoadingStepType = 'creating-account' | 'establishing-auth' | 'refreshing-session' | 'creating-organization';

const OnboardingContent: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const {
    state: { currentStep, steps, admin },
    previousStep,
    setStep,
    completeStep,
    completeOnboarding,
    resetOnboarding,
    submitOnboarding
  } = useOnboarding();

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStepType>('creating-account');

  useEffect(() => {
    const savedState = getOnboardingState();
    if (!savedState || savedState.completed) {
      resetOnboarding();
    }
  }, [resetOnboarding]);

  const handleSave = useCallback(async () => {
    try {
      return Promise.resolve();
    } catch {
      setError('Failed to save progress. Please try again.');
    }
  }, []);

  const handleGetStarted = useCallback(() => {
    setError(null);
    setInfoMessage(null);
    
    const organizationStepIndex = steps.findIndex(step => step.id === 'organization');
    if (organizationStepIndex === -1) {
      console.error('Organization step not found');
      return;
    }

    completeStep('welcome');
    setStep(organizationStepIndex);
  }, [completeStep, setStep, steps]);

  const handleOrganizationSubmit = useCallback(() => {
    setError(null);
    setInfoMessage(null);
    
    const adminStepIndex = steps.findIndex(step => step.id === 'admin');
    if (adminStepIndex === -1) {
      console.error('Admin step not found');
      return;
    }

    completeStep('organization');
    setStep(adminStepIndex);
  }, [completeStep, setStep, steps]);

  const handleAdminSubmit = useCallback(() => {
    setError(null);
    setInfoMessage(null);
    
    try {
      if (!admin.email || !admin.password || !admin.firstName || !admin.lastName) {
        throw new Error('Please fill in all admin account fields');
      }

      completeStep('admin');
      setStep(steps.findIndex(step => step.id === 'team'));
    } catch (err) {
      console.error('Error in admin submit:', err);
      setError(err instanceof Error ? err.message : 'Failed to create admin account');
    }
  }, [admin, completeStep, setStep, steps]);

  const handleReviewSubmit = useCallback(async () => {
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    setLoadingStep('creating-account');
    
    try {
      if (!admin.email || !admin.password || !admin.firstName || !admin.lastName) {
        throw new Error('Please fill in all admin account fields');
      }

      const email = admin.email;
      const password = admin.password;
      const firstName = admin.firstName || '';
      const lastName = admin.lastName || '';
      
      const { error: signUpError, rateLimited } = await signUp(
        email,
        password,
        firstName,
        lastName
      );

      if (signUpError) {
        if (rateLimited) {
          throw new Error(`${signUpError.message} Please wait before trying again.`);
        }
        throw signUpError;
      }
      
      console.log('Email confirmation required, skipping session establishment');
      completeStep('review');
      submitOnboarding();
      setStep(steps.findIndex(step => step.id === 'complete'));
      
      setInfoMessage('Please check your email to confirm your account before logging in.');
      setIsSubmitting(false);
      return;
    } catch (err) {
      console.error('Error during onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  }, [admin, completeStep, setStep, steps, signUp, submitOnboarding]);

  const handleTeamSubmit = useCallback(() => {
    setError(null);
    setInfoMessage(null);
    
    const reviewStepIndex = steps.findIndex(step => step.id === 'review');
    if (reviewStepIndex === -1) {
      console.error('Review step not found');
      return;
    }

    completeStep('team');
    setStep(reviewStepIndex);
  }, [completeStep, setStep, steps]);

  const handleFinishOnboarding = useCallback(() => {
    completeOnboarding();
    navigate('/dashboard');
  }, [completeOnboarding, navigate]);

  const handleRetry = useCallback(() => {
    setError(null);
    setInfoMessage(null);
  }, []);

  const handleBack = useCallback(() => {
    previousStep();
  }, [previousStep]);

  const renderCurrentStep = () => {
    if (error) {
      return (
        <>
          <ErrorDisplay error={error} onRetry={handleRetry} />
          {renderStepContent()}
        </>
      );
    }

    if (infoMessage) {
      return (
        <>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">{infoMessage}</p>
              </div>
            </div>
          </div>
          {renderStepContent()}
        </>
      );
    }

    return renderStepContent();
  };

  const renderStepContent = () => {
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
            error={error}
            isSubmitting={isSubmitting}
            setError={setError}
            setIsSubmitting={setIsSubmitting}
          />
        );
      case 'team':
        return (
          <TeamConfigurationForm
            onSubmit={handleTeamSubmit}
          />
        );
      case 'review':
        return (
          <FinalReviewForm
            onSubmit={handleReviewSubmit}
            onBack={handleBack}
            error={error}
            isSubmitting={isSubmitting}
            setError={setError}
          />
        );
      case 'complete':
        return (
          <div className="text-center p-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Complete!
            </h2>
            <p className="text-gray-600 mb-8">
              Your organization has been created successfully. You can now start using the platform.
            </p>
            <button
              onClick={handleFinishOnboarding}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Go to dashboard"
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

  if (isSubmitting) {
    return <LoadingState step={loadingStep} />;
  }

  return (
    <OnboardingContainer
      currentStep={currentStep}
      totalSteps={steps.length}
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