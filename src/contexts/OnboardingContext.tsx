import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  OnboardingState,
  OnboardingStep,
  OrganizationDetails,
  AdminAccount,
  ValidationError,
  TeamConfiguration
} from '../components/onboarding/types';
import { saveOnboardingState, getOnboardingState, clearOnboardingState } from '../utils/onboardingStorage';

// Action types
type OnboardingAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_ORGANIZATION'; payload: Partial<OrganizationDetails> }
  | { type: 'UPDATE_ADMIN'; payload: Partial<AdminAccount> }
  | { type: 'UPDATE_TEAM'; payload: Partial<TeamConfiguration> }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'SET_VALIDATION_WARNINGS'; payload: ValidationError[] }
  | { type: 'COMPLETE_STEP'; payload: string }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'LOAD_SAVED_STATE'; payload: Partial<OnboardingState> }
  | { type: 'RESET_ONBOARDING' };

// Initial state
const initialSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    completed: false,
    current: true,
    data: null
  },
  {
    id: 'organization',
    title: 'Organization Details',
    completed: false,
    current: false,
    data: null
  },
  {
    id: 'admin',
    title: 'Admin Account',
    completed: false,
    current: false,
    data: null
  },
  {
    id: 'team',
    title: 'Team Setup',
    completed: false,
    current: false,
    data: null
  },
  {
    id: 'complete',
    title: 'Complete',
    completed: false,
    current: false,
    data: null
  }
];

const initialState: OnboardingState = {
  currentStep: 0,
  steps: initialSteps,
  organization: {},
  admin: {},
  team: {
    expectedUsers: 0,
    departments: [],
    roles: []
  },
  validation: {
    errors: [],
    warnings: []
  },
  completed: false,
  lastUpdated: new Date().toISOString()
};

// Create context
const OnboardingContext = createContext<{
  state: OnboardingState;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;
  updateOrganization: (data: Partial<OrganizationDetails>) => void;
  updateAdmin: (data: Partial<AdminAccount>) => void;
  updateTeam: (data: Partial<TeamConfiguration>) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setValidationWarnings: (warnings: ValidationError[]) => void;
  completeStep: (stepId: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
} | null>(null);

// Reducer
function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  let newState: OnboardingState;

  switch (action.type) {
    case 'NEXT_STEP': {
      // Find the next incomplete step
      const nextStepIndex = state.steps.findIndex((step, index) =>
        index > state.currentStep && !step.completed
      );
      
      // If no incomplete step found, use the last step
      const targetStepIndex = nextStepIndex === -1
        ? state.steps.length - 1
        : nextStepIndex;

      newState = {
        ...state,
        currentStep: targetStepIndex,
        steps: state.steps.map((step, index) => ({
          ...step,
          current: index === targetStepIndex
        }))
      };
      break;
    }
    
    case 'PREVIOUS_STEP': {
      const prevStepIndex = Math.max(state.currentStep - 1, 0);
      newState = {
        ...state,
        currentStep: prevStepIndex,
        steps: state.steps.map((step, index) => ({
          ...step,
          current: index === prevStepIndex
        }))
      };
      break;
    }
    
    case 'SET_STEP': {
      const stepIndex = Math.max(0, Math.min(action.payload, state.steps.length - 1));
      const targetStep = state.steps[stepIndex];
      
      // Update steps array with proper current/completed flags
      const updatedSteps = state.steps.map((step, index) => ({
        ...step,
        current: index === stepIndex,
        // Keep steps before target as completed
        completed: index < stepIndex ? true : step.completed
      }));

      console.log('Setting step:', {
        stepIndex,
        targetStepId: targetStep.id,
        currentStep: state.currentStep
      });

      newState = {
        ...state,
        currentStep: stepIndex,
        steps: updatedSteps
      };
      break;
    }
    
    case 'UPDATE_ORGANIZATION':
      newState = {
        ...state,
        organization: {
          ...state.organization,
          ...action.payload
        }
      };
      break;
    
    case 'UPDATE_ADMIN':
      newState = {
        ...state,
        admin: {
          ...state.admin,
          ...action.payload
        }
      };
      break;

    case 'UPDATE_TEAM':
      newState = {
        ...state,
        team: {
          ...state.team,
          ...action.payload
        }
      };
      break;
    
    case 'SET_VALIDATION_ERRORS':
      newState = {
        ...state,
        validation: {
          ...state.validation,
          errors: action.payload
        }
      };
      break;
    
    case 'SET_VALIDATION_WARNINGS':
      newState = {
        ...state,
        validation: {
          ...state.validation,
          warnings: action.payload
        }
      };
      break;
    
    case 'COMPLETE_STEP': {
      // Find the index of the completed step
      const completedStepIndex = state.steps.findIndex(step => step.id === action.payload);
      
      // Find the next incomplete step
      const nextStepIndex = state.steps.findIndex((step, index) =>
        index > completedStepIndex && !step.completed
      );
      
      // If no incomplete step found, stay on current step
      const targetStepIndex = nextStepIndex === -1
        ? state.currentStep
        : nextStepIndex;

      newState = {
        ...state,
        currentStep: targetStepIndex,
        steps: state.steps.map((step, index) => ({
          ...step,
          completed: step.id === action.payload || step.completed,
          current: index === targetStepIndex
        }))
      };
      break;
    }

    case 'COMPLETE_ONBOARDING':
      newState = {
        ...state,
        completed: true,
        steps: state.steps.map(step => ({
          ...step,
          completed: true,
          current: false
        })),
        lastUpdated: new Date().toISOString()
      };
      break;

    case 'LOAD_SAVED_STATE':
      newState = {
        ...state,
        ...action.payload,
        lastUpdated: new Date().toISOString()
      };
      break;

    case 'RESET_ONBOARDING':
      clearOnboardingState();
      newState = {
        ...initialState,
        lastUpdated: new Date().toISOString()
      };
      break;
    
    default:
      return state;
  }

  // Save state after each update
  saveOnboardingState(newState);
  return newState;
}

// Provider component
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Load saved state on mount only if it's valid and incomplete
  useEffect(() => {
    const savedState = getOnboardingState();
    if (
      savedState &&
      Object.keys(savedState).length > 0 &&
      !savedState.completed &&
      savedState.currentStep >= 0 &&
      savedState.currentStep < (savedState.steps?.length || 0)
    ) {
      console.log('Loading saved state:', savedState);
      dispatch({ type: 'LOAD_SAVED_STATE', payload: savedState });
    } else {
      console.log('Starting fresh onboarding');
      dispatch({ type: 'RESET_ONBOARDING' });
    }
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const previousStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_STEP' });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const updateOrganization = useCallback((data: Partial<OrganizationDetails>) => {
    dispatch({ type: 'UPDATE_ORGANIZATION', payload: data });
  }, []);

  const updateAdmin = useCallback((data: Partial<AdminAccount>) => {
    dispatch({ type: 'UPDATE_ADMIN', payload: data });
  }, []);

  const updateTeam = useCallback((data: Partial<TeamConfiguration>) => {
    dispatch({ type: 'UPDATE_TEAM', payload: data });
  }, []);

  const setValidationErrors = useCallback((errors: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
  }, []);

  const setValidationWarnings = useCallback((warnings: ValidationError[]) => {
    dispatch({ type: 'SET_VALIDATION_WARNINGS', payload: warnings });
  }, []);

  const completeStep = useCallback((stepId: string) => {
    dispatch({ type: 'COMPLETE_STEP', payload: stepId });
  }, []);

  const completeOnboarding = useCallback(() => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    clearOnboardingState(); // Clear saved state when onboarding is complete
  }, []);

  const resetOnboarding = useCallback(() => {
    dispatch({ type: 'RESET_ONBOARDING' });
  }, []);

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
        resetOnboarding
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingProvider;
