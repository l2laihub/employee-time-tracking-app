# Onboarding UI Components Specification

## Common Components

### 1. OnboardingContainer
```typescript
interface OnboardingContainerProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
  children: React.ReactNode;
}
```

```tsx
// Usage
<OnboardingContainer
  currentStep={1}
  totalSteps={10}
  onNext={handleNext}
  onBack={handleBack}
  onSave={handleSave}
>
  {currentStepComponent}
</OnboardingContainer>
```

### 2. ProgressIndicator
```typescript
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: {
    title: string;
    completed: boolean;
    current: boolean;
  }[];
}
```

```tsx
// Usage
<ProgressIndicator
  currentStep={1}
  totalSteps={10}
  steps={[
    { title: 'Welcome', completed: true, current: false },
    { title: 'Organization', completed: false, current: true },
    // ...more steps
  ]}
/>
```

## Step-Specific Components

### 1. WelcomeScreen
```typescript
interface WelcomeScreenProps {
  valuePropositions: string[];
  testimonials?: {
    text: string;
    author: string;
    company: string;
  }[];
  onGetStarted: () => void;
}
```

```tsx
// Usage
<WelcomeScreen
  valuePropositions={[
    'Streamline your workforce management',
    'Automate time tracking',
    'Simplify PTO management'
  ]}
  testimonials={[
    {
      text: 'Transformed our team productivity',
      author: 'John Doe',
      company: 'Tech Corp'
    }
  ]}
  onGetStarted={handleGetStarted}
/>
```

### 2. OrganizationForm
```typescript
interface OrganizationFormProps {
  initialData?: Partial<OrganizationDetails>;
  onSubmit: (data: OrganizationDetails) => void;
  onSaveDraft: (data: Partial<OrganizationDetails>) => void;
}
```

```tsx
// Usage
<OrganizationForm
  initialData={savedDraft}
  onSubmit={handleSubmit}
  onSaveDraft={handleSaveDraft}
/>
```

### 3. AdminAccountForm
```typescript
interface AdminAccountFormProps {
  initialData?: Partial<AdminAccount>;
  passwordRequirements: PasswordRequirements;
  onSubmit: (data: AdminAccount) => void;
  onValidate: (field: string, value: any) => ValidationError[];
}
```

```tsx
// Usage
<AdminAccountForm
  passwordRequirements={{
    minLength: 8,
    requiresUppercase: true,
    requiresLowercase: true,
    requiresNumber: true,
    requiresSpecialChar: true
  }}
  onSubmit={handleSubmit}
  onValidate={validateField}
/>
```

### 4. TeamConfigurationForm
```typescript
interface TeamConfigurationFormProps {
  initialData?: Partial<TeamSetup>;
  onSubmit: (data: TeamSetup) => void;
  onDepartmentAdd: (department: Department) => void;
  onRoleAdd: (role: Role) => void;
}
```

```tsx
// Usage
<TeamConfigurationForm
  initialData={savedTeamData}
  onSubmit={handleSubmit}
  onDepartmentAdd={handleDepartmentAdd}
  onRoleAdd={handleRoleAdd}
/>
```

### 5. WorkspaceCustomizer
```typescript
interface WorkspaceCustomizerProps {
  initialTheme?: Theme;
  features: Feature[];
  onThemeChange: (theme: Theme) => void;
  onFeatureToggle: (feature: string, enabled: boolean) => void;
  onPreferencesChange: (preferences: Preferences) => void;
}
```

```tsx
// Usage
<WorkspaceCustomizer
  initialTheme={defaultTheme}
  features={availableFeatures}
  onThemeChange={handleThemeChange}
  onFeatureToggle={handleFeatureToggle}
  onPreferencesChange={handlePreferencesChange}
/>
```

### 6. IntegrationSelector
```typescript
interface IntegrationSelectorProps {
  availableIntegrations: Integration[];
  selectedIntegrations: string[];
  onSelect: (integrationId: string) => void;
  onConfigure: (integration: Integration) => void;
}
```

```tsx
// Usage
<IntegrationSelector
  availableIntegrations={integrations}
  selectedIntegrations={selected}
  onSelect={handleSelect}
  onConfigure={handleConfigure}
/>
```

### 7. TutorialCarousel
```typescript
interface TutorialCarouselProps {
  steps: TutorialStep[];
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
}
```

```tsx
// Usage
<TutorialCarousel
  steps={tutorialSteps}
  currentStep={currentTutorialStep}
  onComplete={handleTutorialComplete}
  onSkip={handleTutorialSkip}
/>
```

### 8. SecuritySetupForm
```typescript
interface SecuritySetupFormProps {
  initialSettings?: SecuritySetup;
  onSubmit: (settings: SecuritySetup) => void;
  onMFASetup: (type: MFAType) => void;
}
```

```tsx
// Usage
<SecuritySetupForm
  initialSettings={defaultSecurity}
  onSubmit={handleSecuritySubmit}
  onMFASetup={handleMFASetup}
/>
```

### 9. DataImportWizard
```typescript
interface DataImportWizardProps {
  supportedTypes: string[];
  onFileUpload: (file: File) => void;
  onMapFields: (mapping: Record<string, string>) => void;
  onValidate: (data: any[]) => ValidationResult;
}
```

```tsx
// Usage
<DataImportWizard
  supportedTypes={['csv', 'excel']}
  onFileUpload={handleFileUpload}
  onMapFields={handleFieldMapping}
  onValidate={validateImportData}
/>
```

### 10. SuccessScreen
```typescript
interface SuccessScreenProps {
  organization: OrganizationDetails;
  nextSteps: NextStep[];
  resources: Resource[];
  onComplete: () => void;
}
```

```tsx
// Usage
<SuccessScreen
  organization={orgDetails}
  nextSteps={recommendedSteps}
  resources={helpfulResources}
  onComplete={handleOnboardingComplete}
/>
```

## Shared Components

### 1. ValidationMessage
```typescript
interface ValidationMessageProps {
  errors: ValidationError[];
  type: 'error' | 'warning' | 'success';
}
```

### 2. SaveIndicator
```typescript
interface SaveIndicatorProps {
  status: 'saving' | 'saved' | 'error';
  lastSaved?: Date;
}
```

### 3. StepNavigation
```typescript
interface StepNavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}
```

## Styling Guidelines

### Theme Variables
```css
:root {
  --onboarding-primary: #2563eb;
  --onboarding-secondary: #6b7280;
  --onboarding-success: #10b981;
  --onboarding-error: #ef4444;
  --onboarding-warning: #f59e0b;
  
  --onboarding-text-primary: #111827;
  --onboarding-text-secondary: #4b5563;
  
  --onboarding-border-radius: 0.5rem;
  --onboarding-spacing-unit: 1rem;
}
```

### Common Classes
```css
.onboarding-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--onboarding-spacing-unit);
}

.onboarding-step {
  background: white;
  border-radius: var(--onboarding-border-radius);
  padding: calc(var(--onboarding-spacing-unit) * 2);
}

.onboarding-button {
  padding: 0.75rem 1.5rem;
  border-radius: var(--onboarding-border-radius);
  font-weight: 600;
}
```

## Animation Specifications

### Transitions
```typescript
const transitions = {
  step: {
    duration: 300,
    ease: 'easeInOut',
  },
  fade: {
    duration: 200,
    ease: 'linear',
  },
  slide: {
    duration: 400,
    ease: 'easeOut',
  },
};
```

### Motion Variants
```typescript
const motionVariants = {
  stepEnter: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
};
```

## Accessibility Guidelines

### ARIA Labels
```typescript
const ariaLabels = {
  stepProgress: 'Onboarding progress',
  stepNavigation: 'Step navigation',
  formValidation: 'Form validation message',
  requiredField: 'Required field',
};
```

### Keyboard Navigation
- Tab navigation for all interactive elements
- Enter/Space for button activation
- Escape for modal closing
- Arrow keys for carousel navigation

## Error Handling

### Error States
```typescript
interface ErrorState {
  field?: string;
  message: string;
  type: 'validation' | 'server' | 'network';
  recoverable: boolean;
}
```

### Error Display
```typescript
interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss: () => void;
}