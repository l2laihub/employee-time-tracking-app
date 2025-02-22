# Manual Testing Guide - Onboarding Flow

## Setup
1. Start the development server:
```bash
npm run dev
```

2. Clear your browser's local storage to ensure a fresh start
3. Navigate to the onboarding page at `/onboarding`

## Test Scenarios

### 1. Welcome Screen
- [ ] Verify all value propositions are displayed
- [ ] "Get Started" button is visible
- [ ] Clicking "Get Started" navigates to Organization Form

### 2. Organization Form
- [ ] Fill in organization details:
  ```
  Name: Test Organization
  Industry: Technology
  Size: 1-10 employees
  Website: https://example.com (optional)
  ```
- [ ] Verify form validation:
  - Try submitting without name (should show error)
  - Try submitting without selecting industry (should show error)
  - Try submitting without size (should show error)
  - Try invalid website format (should show error)
- [ ] Verify successful submission navigates to Admin Account form

### 3. Admin Account Form
- [ ] Fill in admin details:
  ```
  First Name: John
  Last Name: Doe
  Email: admin@example.com
  Password: StrongP@ssw0rd
  ```
- [ ] Verify password requirements:
  - At least 8 characters
  - Contains uppercase letter
  - Contains lowercase letter
  - Contains number
  - Contains special character
- [ ] Verify form validation:
  - Try weak password (should show requirements)
  - Try invalid email format (should show error)
  - Try submitting without required fields (should show errors)
- [ ] Verify successful submission navigates to Team Configuration form

### 4. Team Configuration
- [ ] Set expected number of users: 10
- [ ] Add departments:
  ```
  Name: Engineering
  Description: Software development team
  
  Name: Marketing
  Description: Marketing and communications
  ```
- [ ] Add roles:
  ```
  Name: Developer
  Description: Software engineer
  
  Name: Manager
  Description: Team lead
  ```
- [ ] Verify:
  - Can add/remove departments
  - Can add/remove roles
  - Required fields are validated
  - Successful submission navigates to completion screen

### 5. Success Screen
- [ ] Verify completion message is shown
- [ ] "Go to Dashboard" button is visible and clickable
- [ ] Clicking button navigates to dashboard

## State Persistence
- [ ] Start onboarding and complete first two steps
- [ ] Refresh the page
- [ ] Verify progress is restored
- [ ] Continue and complete onboarding
- [ ] Verify state is cleared after completion

## Error Handling
- [ ] Test network disconnection:
  1. Disable network in DevTools
  2. Try to submit forms
  3. Verify error messages are shown
  4. Verify can retry when network is restored

## Navigation
- [ ] Verify can move back through steps
- [ ] Verify can't skip steps
- [ ] Verify progress indicator shows correct step
- [ ] Verify browser back/forward navigation works

## Known Issues
- None currently identified

## Test Data
Use these values for consistent testing:
```typescript
const testOrg = {
  name: "Test Organization",
  industry: "technology",
  size: "SMALL",
  website: "https://example.com"
};

const testAdmin = {
  firstName: "John",
  lastName: "Doe",
  email: "admin@example.com",
  password: "StrongP@ssw0rd"
};

const testTeam = {
  expectedUsers: 10,
  departments: [
    { name: "Engineering", description: "Software development team" },
    { name: "Marketing", description: "Marketing and communications" }
  ],
  roles: [
    { name: "Developer", description: "Software engineer" },
    { name: "Manager", description: "Team lead" }
  ]
};