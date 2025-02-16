# Employee Form Issues Fix Plan

## Current Issues
1. Can't view the Edit Employee form when trying to edit an employee from the list
2. Can't update an employee
3. Error: "Cannot read properties of null (reading 'vacation')" in EmployeeForm.tsx

## Root Cause
The error occurs because the employee's PTO data structure is not properly initialized or is missing when the data is fetched from the database. The Employee type requires a specific PTO structure:

```typescript
pto: {
  vacation: {
    beginningBalance: number;
    ongoingBalance: number;
    firstYearRule: number;
    used: number;
  };
  sickLeave: {
    beginningBalance: number;
    used: number;
  };
}
```

## Proposed Solutions

### 1. Add Default PTO Structure
Modify the employee data fetching logic to ensure the PTO structure is always properly initialized. This can be done by:

a) Adding a default PTO structure in the listEmployees function in employees.ts:
```typescript
const defaultPTO = {
  vacation: {
    beginningBalance: 0,
    ongoingBalance: 0,
    firstYearRule: 40,
    used: 0
  },
  sickLeave: {
    beginningBalance: 0,
    used: 0
  }
};
```

b) Ensuring this structure is applied when data is fetched.

### 2. Add Null Checks in EmployeeForm
Modify the EmployeeForm component to safely handle cases where the PTO structure might be incomplete:

a) Add null checks when accessing PTO data
b) Initialize form data with default values if PTO data is missing

### 3. Update Database Schema
Ensure the database schema enforces the required PTO structure:

a) Add proper constraints in the database
b) Add migration to fix any existing records with missing PTO data

## Implementation Steps

1. First, implement the form-level fixes to prevent crashes
2. Add proper data initialization in the service layer
3. Create a database migration to fix existing data
4. Add validation in the API layer

## Testing Plan

1. Test creating new employees
2. Test editing existing employees
3. Test employees with missing PTO data
4. Verify form renders correctly in all cases
5. Verify updates work properly

Would you like to proceed with implementing these fixes?