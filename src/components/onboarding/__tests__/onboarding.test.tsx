import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OnboardingPage from '../../../pages/Onboarding';
import { Industry, OrganizationSize } from '../types';

// Mock storage utilities
const mockGetOnboardingState = vi.fn(() => null);
const mockSaveOnboardingState = vi.fn();
const mockClearOnboardingState = vi.fn();
const mockIsOnboardingInProgress = vi.fn(() => false);

vi.mock('../../../utils/onboardingStorage', () => ({
  getOnboardingState: mockGetOnboardingState,
  saveOnboardingState: mockSaveOnboardingState,
  loadOnboardingState: vi.fn(() => ({
    organization: {},
    adminAccount: {},
    teamConfiguration: {}
  })),
  clearOnboardingState: mockClearOnboardingState,
  isOnboardingInProgress: mockIsOnboardingInProgress
}));

// Mock onboarding context
const mockUpdateOrganization = vi.fn();
const mockCompleteStep = vi.fn();
const mockNextStep = vi.fn();
const mockPreviousStep = vi.fn();
const mockSetStep = vi.fn();
const mockUpdateAdmin = vi.fn();
const mockUpdateTeam = vi.fn();
const mockSetValidationErrors = vi.fn();
const mockSetValidationWarnings = vi.fn();
const mockCompleteOnboarding = vi.fn();
const mockResetOnboarding = vi.fn();

const mockState = {
  currentStep: 0,
  steps: [
    { id: 'welcome', title: 'Welcome', completed: false, current: true },
    { id: 'organization', title: 'Organization Details', completed: false, current: false },
    { id: 'admin', title: 'Admin Account', completed: false, current: false },
    { id: 'team', title: 'Team Setup', completed: false, current: false },
    { id: 'complete', title: 'Complete', completed: false, current: false }
  ],
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
  completed: false
};

vi.mock('../../../contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    state: mockState,
    previousStep: mockPreviousStep,
    nextStep: mockNextStep,
    setStep: mockSetStep,
    updateOrganization: mockUpdateOrganization,
    updateAdmin: mockUpdateAdmin,
    updateTeam: mockUpdateTeam,
    setValidationErrors: mockSetValidationErrors,
    setValidationWarnings: mockSetValidationWarnings,
    completeStep: mockCompleteStep,
    completeOnboarding: mockCompleteOnboarding,
    resetOnboarding: mockResetOnboarding
  }),
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock organization context
vi.mock('../../../contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    createOrganization: vi.fn(() => Promise.resolve()),
    isLoading: false
  })
}));

// Mock auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    loading: false
  })
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
});

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the full onboarding flow', async () => {
    render(
      <BrowserRouter>
        <OnboardingPage />
      </BrowserRouter>
    );

    // Welcome Screen
    expect(screen.getByText(/Welcome to Employee Time Tracking/i)).toBeDefined();
    fireEvent.click(screen.getByText(/Get Started/i));

    // Organization Form
    await waitFor(() => {
      expect(screen.getByText(/Tell us about your organization/i)).toBeDefined();
    });

    // Fill out organization form with all fields
    fireEvent.change(screen.getByLabelText(/Organization Name/i), {
      target: { value: 'Test Org' }
    });
    
    const industrySelect = screen.getByLabelText(/Industry/i);
    fireEvent.change(industrySelect, {
      target: { value: Industry.TECHNOLOGY }
    });
    
    const sizeSelect = screen.getByLabelText(/Organization Size/i);
    fireEvent.change(sizeSelect, {
      target: { value: OrganizationSize.SMALL }
    });
    
    fireEvent.change(screen.getByLabelText(/Website/i), {
      target: { value: 'https://testorg.com' }
    });

    fireEvent.click(screen.getByText(/Continue/i));

    // Verify organization data was updated
    expect(mockUpdateOrganization).toHaveBeenCalledWith({
      name: 'Test Org',
      industry: Industry.TECHNOLOGY,
      size: OrganizationSize.SMALL,
      website: 'https://testorg.com'
    });

    expect(mockCompleteStep).toHaveBeenCalledWith('organization');

    // Admin Account Form
    expect(screen.getByText(/Create Admin Account/i)).toBeDefined();
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongP@ssw0rd' }
    });
    fireEvent.click(screen.getByText(/Continue/i));

    // Team Configuration Form
    expect(screen.getByText(/Configure Your Team Structure/i)).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Expected Number of Users/i), {
      target: { value: '10' }
    });

    // Add a department
    fireEvent.change(screen.getByPlaceholderText(/Department Name/i), {
      target: { value: 'Engineering' }
    });
    fireEvent.click(screen.getByText('Add'));

    // Add a role
    fireEvent.change(screen.getByPlaceholderText(/Role Name/i), {
      target: { value: 'Developer' }
    });
    fireEvent.click(screen.getByText('Add'));

    fireEvent.click(screen.getByText(/Continue/i));

    // Success Screen
    expect(screen.getByText(/Setup Complete!/i)).toBeDefined();
    fireEvent.click(screen.getByText(/Go to Dashboard/i));

    // Verify navigation to dashboard and completion
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockCompleteOnboarding).toHaveBeenCalled();
  });

  it('validates required fields in organization form', async () => {
    render(
      <BrowserRouter>
        <OnboardingPage />
      </BrowserRouter>
    );

    // Navigate to organization form
    fireEvent.click(screen.getByText(/Get Started/i));

    // Try to continue without filling required fields
    fireEvent.click(screen.getByText(/Continue/i));

    // HTML5 validation should prevent form submission
    expect(mockUpdateOrganization).not.toHaveBeenCalled();
    expect(mockCompleteStep).not.toHaveBeenCalled();

    // Fill only required fields
    fireEvent.change(screen.getByLabelText(/Organization Name/i), {
      target: { value: 'Test Org' }
    });
    
    fireEvent.change(screen.getByLabelText(/Industry/i), {
      target: { value: Industry.TECHNOLOGY }
    });
    
    fireEvent.change(screen.getByLabelText(/Organization Size/i), {
      target: { value: OrganizationSize.SMALL }
    });

    // Now the form should submit successfully
    fireEvent.click(screen.getByText(/Continue/i));
    
    expect(mockUpdateOrganization).toHaveBeenCalledWith({
      name: 'Test Org',
      industry: Industry.TECHNOLOGY,
      size: OrganizationSize.SMALL,
      website: ''
    });
  });

  it('persists organization state', async () => {
    mockGetOnboardingState.mockReturnValue(null);

    render(
      <BrowserRouter>
        <OnboardingPage />
      </BrowserRouter>
    );

    // Navigate to organization form
    fireEvent.click(screen.getByText(/Get Started/i));

    // Fill out organization form with all required fields
    fireEvent.change(screen.getByLabelText(/Organization Name/i), {
      target: { value: 'Test Org' }
    });
    
    fireEvent.change(screen.getByLabelText(/Industry/i), {
      target: { value: Industry.TECHNOLOGY }
    });
    
    fireEvent.change(screen.getByLabelText(/Organization Size/i), {
      target: { value: OrganizationSize.SMALL }
    });

    fireEvent.click(screen.getByText(/Continue/i));

    // Verify state was saved with correct data
    expect(mockSaveOnboardingState).toHaveBeenCalled();
    expect(mockUpdateOrganization).toHaveBeenCalledWith({
      name: 'Test Org',
      industry: Industry.TECHNOLOGY,
      size: OrganizationSize.SMALL,
      website: ''
    });
  });
});