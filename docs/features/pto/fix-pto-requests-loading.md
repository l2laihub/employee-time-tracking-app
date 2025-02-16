# Fix PTO Requests Loading for Admin Users

## Issue
Admin users cannot view PTO requests, while regular employees can. This is due to incorrect filtering logic in the PTO page component.

## Current Behavior
- Regular employees can see PTO requests
- Admin users cannot see PTO requests
- The filtering logic is reversed from what it should be

## Root Cause
In `src/pages/PTO.tsx`, the filtering logic is backwards:
```typescript
let filtered = isAdmin ? requests : requests.filter(r => {
  return r.userId === selectedEmployee?.id;
});
```
This shows all requests for admins without any filtering, and filters by selectedEmployee for regular users.

## Solution Plan
1. Fix the filtering logic in `src/pages/PTO.tsx`:
   - Regular employees should only see their own requests
   - Admins should see all requests by default
   - Admins should be able to filter by employee when one is selected
   
2. Update the filtering logic to:
```typescript
let filtered = requests;

// For regular employees, only show their own requests
if (!isAdmin && selectedEmployee) {
  filtered = filtered.filter(r => r.userId === selectedEmployee.id);
}

// For admins, filter by selected employee if one is selected
if (isAdmin && filters.employee !== 'all') {
  filtered = filtered.filter(r => r.userId === filters.employee);
}
```

3. Add debug logging to track:
   - Current user role
   - Selected employee
   - Filter states
   - Request counts before and after filtering

## Expected Behavior After Fix
- Regular employees will only see their own PTO requests
- Admin users will see all PTO requests by default
- Admin users can filter requests by employee using the employee filter dropdown
- The filtering functionality will work correctly for both admin and regular users

## Testing Plan
1. Test as regular employee:
   - Should only see their own requests
   - Cannot see other employees' requests
   
2. Test as admin:
   - Should see all requests by default
   - Can filter requests by employee
   - Can see and review requests from all employees

## Implementation Notes
- The database policies are correctly set up
- The PTOContext and service layer are working as expected
- Only the filtering logic in the PTO page component needs to be modified