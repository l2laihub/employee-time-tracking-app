import { ReactNode } from 'react';

// Core organization types
export interface OrganizationDetails {
  name: string;
  industry: Industry;
  size: OrganizationSize;
  website?: string;
}

export enum Industry {
  HEALTHCARE = 'healthcare',
  TECHNOLOGY = 'technology',
  RETAIL = 'retail',
  CONTRACTING = 'contracting',
  CONSTRUCTION = 'construction',
  CONSULTING = 'consulting',
  EDUCATION = 'education',
  FINANCE = 'finance',
  HOSPITALITY = 'hospitality',
  LEGAL = 'legal',
  MANUFACTURING = 'manufacturing',
  NONPROFIT = 'nonprofit',
  PROFESSIONAL_SERVICES = 'professional_services',
  TRANSPORTATION = 'transportation',
  OTHER = 'other'
}

export enum OrganizationSize {
  SMALL = '1-10',
  MEDIUM = '11-50',
  LARGE = '51+'
}

// Admin account types
export interface AdminAccount {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'owner' | 'admin';
  _passwordExists?: boolean; // Flag to indicate password is stored in sessionStorage
}

// Team configuration types
export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

export interface TeamConfiguration {
  expectedUsers?: number;
  departments?: (string | Department)[];
  roles?: (string | Role)[];
  serviceTypes?: (string | ServiceType)[];
}

// Onboarding specific types
export interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
  data: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  organization: Partial<OrganizationDetails>;
  admin: Partial<AdminAccount>;
  team: Partial<TeamConfiguration>;
  validation: {
    errors: ValidationError[];
    warnings: ValidationError[];
  };
  completed: boolean;
  submitted: boolean;
  lastUpdated?: string;
  expiresAt?: string; // Expiration timestamp for onboarding data
}

// Component props
export interface OnboardingContainerProps {
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack: () => void;
  onSave: () => void;
  children: ReactNode;
}

export interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: {
    title: string;
    completed: boolean;
    current: boolean;
  }[];
}

export interface StepNavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}

export interface SaveIndicatorProps {
  status: 'saving' | 'saved' | 'error';
  lastSaved?: Date;
}