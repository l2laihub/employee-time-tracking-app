import {
  OnboardingState,
  OnboardingStep,
  OrganizationDetails,
  AdminAccount,
  ValidationError,
  TeamConfiguration
} from '../components/onboarding/types';

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

export const initialSteps: OnboardingStep[];
export const initialState: OnboardingState;
export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState;
