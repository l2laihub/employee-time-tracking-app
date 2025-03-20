import { OnboardingStep, OnboardingState } from '../components/onboarding/types';

export const initialSteps: OnboardingStep[] = [
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
    id: 'review',
    title: 'Review & Submit',
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

export const initialState: OnboardingState = {
  currentStep: 0,
  steps: initialSteps,
  organization: {},
  admin: {},
  team: {
    expectedUsers: 0,
    departments: [],
    roles: [],
    serviceTypes: []
  },
  validation: {
    errors: [],
    warnings: []
  },
  completed: false,
  submitted: false,
  lastUpdated: new Date().toISOString()
};