const ONBOARDING_STATE_KEY = 'onboardingState';

import { OnboardingState } from '../components/onboarding/types';
import { initialState, initialSteps } from './onboardingConstants';

/**
 * Securely saves the onboarding state to localStorage
 * Handles sensitive data like passwords appropriately
 */
export const saveOnboardingState = (state: Partial<OnboardingState>): void => {
  const currentState = getOnboardingState();
  // Create a copy of the state to avoid modifying the original
  const stateCopy = { ...currentState, ...state };
  
  // If there's a password, handle it securely
  if (stateCopy.admin?.password) {
    // Store an indicator that password exists but not the actual value in localStorage
    stateCopy.admin = { 
      ...stateCopy.admin, 
      // Store a placeholder instead of the actual password
      password: '[PASSWORD_PROTECTED]',
      // Store the actual password in sessionStorage which is cleared when the browser is closed
      _passwordExists: true
    };
    
    // Store the actual password in sessionStorage which is cleared when the browser is closed
    if (state.admin?.password) {
      sessionStorage.setItem('onboarding_password', state.admin.password);
    }
  }
  
  // Add expiration timestamp (24 hours from now)
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 24);
  stateCopy.expiresAt = expirationTime.toISOString();
  
  // Update the last updated timestamp
  stateCopy.lastUpdated = new Date().toISOString();
  
  localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(stateCopy));
};

/**
 * Retrieves the onboarding state from localStorage
 * Handles sensitive data retrieval
 */
export const getOnboardingState = (): OnboardingState => {
  const savedState = localStorage.getItem(ONBOARDING_STATE_KEY);
  if (!savedState) return initialState;

  try {
    const parsedState = JSON.parse(savedState);
    
    // Check if state has expired
    if (parsedState.expiresAt) {
      const expirationDate = new Date(parsedState.expiresAt);
      if (expirationDate < new Date()) {
        console.log('Onboarding state has expired, returning default state');
        clearOnboardingState();
        return initialState;
      }
    }
    
    // Retrieve password from sessionStorage if needed
    if (parsedState.admin?._passwordExists) {
      const password = sessionStorage.getItem('onboarding_password');
      if (password) {
        parsedState.admin.password = password;
      }
    }
    
    return parsedState;
  } catch (error) {
    console.error('Error parsing onboarding state:', error);
    return initialState;
  }
};

/**
 * Clears all onboarding state data from storage
 */
export const clearOnboardingState = (): void => {
  localStorage.removeItem(ONBOARDING_STATE_KEY);
  sessionStorage.removeItem('onboarding_password');
};

export const updateOnboardingStep = (step: number): void => {
  saveOnboardingState({ currentStep: step });
};

export const completeOnboarding = (): void => {
  saveOnboardingState({ completed: true });
  // Clear sensitive data after completion
  sessionStorage.removeItem('onboarding_password');
};

export const isOnboardingComplete = (): boolean => {
  const state = getOnboardingState();
  return state.completed;
};

/**
 * Checks if the onboarding state has expired
 */
export const isOnboardingExpired = (): boolean => {
  try {
    const savedState = localStorage.getItem(ONBOARDING_STATE_KEY);
    if (!savedState) return true;
    
    const state = JSON.parse(savedState);
    if (!state.expiresAt) return false;
    
    const expirationDate = new Date(state.expiresAt);
    return expirationDate < new Date();
  } catch (error) {
    console.error('Error checking onboarding expiration:', error);
    return true;
  }
};