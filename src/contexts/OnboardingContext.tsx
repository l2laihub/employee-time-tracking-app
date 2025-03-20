import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import {
  OnboardingState,
  AdminAccount,
  ValidationError,
  TeamConfiguration,
  OrganizationDetails
} from '../components/onboarding/types';
import { getOnboardingState, clearOnboardingState } from '../utils/onboardingStorage';
import { onboardingReducer } from '../utils/onboardingReducer';
import { initialState } from '../utils/onboardingConstants';

// Context type
interface OnboardingContextType {
  state: OnboardingState;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (stepIndex: number) => void;
  updateOrganization: (data: Partial<OrganizationDetails>) => void;
  updateAdmin: (data: Partial<AdminAccount>) => void;
  updateTeam: (data: Partial<TeamConfiguration>) => Promise<void>;
  setValidationErrors: (errors: ValidationError[]) => void;
  setValidationWarnings: (warnings: ValidationError[]) => void;
  completeStep: (stepId: string) => void;
  completeOnboarding: () => void;
  submitOnboarding: () => void;
  resetOnboarding: () => void;
}

// Create context
export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Load saved state on mount
  useEffect(() => {
    const savedState = getOnboardingState();
    if (savedState && !savedState.completed) {
      dispatch({ type: 'LOAD_SAVED_STATE', payload: savedState });
    }
  }, [dispatch]);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, [dispatch]);

  const previousStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_STEP' });
  }, [dispatch]);

  const setStep = useCallback((stepIndex: number) => {
    dispatch({ type: 'SET_STEP', payload: stepIndex });
  }, [dispatch]);

  const updateOrganization = useCallback((data: Partial<OrganizationDetails>) => {
    dispatch({ type: 'UPDATE_ORGANIZATION', payload: data });
  }, [dispatch]);

  const updateAdmin = useCallback((data: Partial<AdminAccount>) => {
    dispatch({ type: 'UPDATE_ADMIN', payload: data });
  }, [dispatch]);

  const updateTeam = useCallback(async (data: Partial<TeamConfiguration>) => {
    dispatch({ type: 'UPDATE_TEAM', payload: data });
    return Promise.resolve();
  }, [dispatch]);

  const setValidationErrors = useCallback((errors: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
  }, [dispatch]);

  const setValidationWarnings = useCallback((warnings: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_WARNINGS', payload: warnings });
  }, [dispatch]);

  const completeStep = useCallback((stepId: string) => {
    dispatch({ type: 'COMPLETE_STEP', payload: stepId });
  }, [dispatch]);

  const completeOnboarding = useCallback(() => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    clearOnboardingState();
  }, [dispatch]);

  const submitOnboarding = useCallback(() => {
    dispatch({ type: 'SUBMIT_ONBOARDING' });
  }, [dispatch]);

  const resetOnboarding = useCallback(() => {
    dispatch({ type: 'RESET_ONBOARDING' });
    clearOnboardingState();
  }, [dispatch]);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        nextStep,
        previousStep,
        setStep,
        updateOrganization,
        updateAdmin,
        updateTeam,
        setValidationErrors,
        setValidationWarnings,
        completeStep,
        completeOnboarding,
        submitOnboarding,
        resetOnboarding
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
