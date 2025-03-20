import {
  OnboardingState,
  OnboardingStep,
  OrganizationDetails,
  AdminAccount,
  ValidationError,
  TeamConfiguration
} from '../components/onboarding/types';
import { saveOnboardingState } from './onboardingStorage';
import { initialState, initialSteps } from './onboardingConstants';

// Action types
export type OnboardingAction =
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
  | { type: 'SUBMIT_ONBOARDING' }
  | { type: 'LOAD_SAVED_STATE'; payload: Partial<OnboardingState> }
  | { type: 'RESET_ONBOARDING' };

// Reducer
export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
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
      const stepId = action.payload;
      const stepIndex = state.steps.findIndex(step => step.id === stepId);
      
      if (stepIndex === -1) {
        console.error(`Step with id ${stepId} not found`);
        return state;
      }
      
      // Mark the step as completed
      const updatedSteps = state.steps.map((step, index) => ({
        ...step,
        completed: index === stepIndex ? true : step.completed
      }));
      
      newState = {
        ...state,
        steps: updatedSteps
      };
      break;
    }
    
    case 'COMPLETE_ONBOARDING':
      newState = {
        ...state,
        completed: true,
        steps: state.steps.map(step => ({
          ...step,
          completed: true
        }))
      };
      break;
    
    case 'SUBMIT_ONBOARDING':
      // Set expiration date (24 hours from now)
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 24);
      
      newState = {
        ...state,
        submitted: true,
        expiresAt: expirationTime.toISOString()
      };
      break;
    
    case 'LOAD_SAVED_STATE': {
      // Ensure we always have the initialSteps if the saved state doesn't have steps
      const savedSteps = action.payload.steps && action.payload.steps.length > 0 
        ? action.payload.steps 
        : initialSteps;
        
      newState = {
        ...state,
        ...action.payload,
        steps: savedSteps,
        lastUpdated: new Date().toISOString()
      };
      break;
    }
    
    case 'RESET_ONBOARDING':
      newState = {
        ...initialState,
        lastUpdated: new Date().toISOString()
      };
      break;
    
    default:
      return state;
  }
  
  // Save state to localStorage (except for LOAD_SAVED_STATE to avoid circular saves)
  if (action.type !== 'LOAD_SAVED_STATE') {
    const stateToSave = {
      ...newState,
      lastUpdated: new Date().toISOString()
    };
    saveOnboardingState(stateToSave);
  }
  
  return {
    ...newState,
    lastUpdated: new Date().toISOString()
  };
}
