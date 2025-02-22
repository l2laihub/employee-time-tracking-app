const ONBOARDING_STATE_KEY = 'onboardingState';

import { OnboardingState } from '../components/onboarding/types';

export const saveOnboardingState = (state: Partial<OnboardingState>): void => {
  const currentState = getOnboardingState();
  const newState = { ...currentState, ...state };
  localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(newState));
};

export const getOnboardingState = (): OnboardingState => {
  const defaultState: OnboardingState = {
    currentStep: 0,
    steps: [],
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

  const savedState = localStorage.getItem(ONBOARDING_STATE_KEY);
  if (!savedState) return defaultState;

  try {
    return JSON.parse(savedState);
  } catch (error) {
    console.error('Error parsing onboarding state:', error);
    return defaultState;
  }
};

export const clearOnboardingState = (): void => {
  localStorage.removeItem(ONBOARDING_STATE_KEY);
};

export const updateOnboardingStep = (step: number): void => {
  saveOnboardingState({ currentStep: step });
};

export const completeOnboarding = (): void => {
  saveOnboardingState({ completed: true });
};

export const isOnboardingComplete = (): boolean => {
  const state = getOnboardingState();
  return state.completed;
};