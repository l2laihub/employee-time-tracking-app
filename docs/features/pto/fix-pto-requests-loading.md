# Fix PTO Requests Loading Issue

## Problem
PTO requests are not displaying on the PTO Requests page despite being successfully created and stored in the database.

## Analysis

After reviewing the code, several potential issues were identified:

1. **Request Loading Filter**
   - In `PTOContext.tsx`, requests are only loaded with 'pending' status
   - However, the UI shows and filters all statuses (pending, approved, rejected)
   - This mismatch means non-pending requests won't appear

2. **Limited Error Logging**
   - The `listPTORequests` service has minimal error logging
   - No logging of raw data received from Supabase
   - Difficult to debug data transformation issues

3. **Organization ID Dependency**
   - Request loading depends on organization?.id being available
   - No logging around when/if this dependency is satisfied
   - Could cause silent failures if organization context isn't ready

## Proposed Solution

### 1. Modify PTOContext.tsx
- Remove the 'pending' status filter when loading requests
- Add debug logging for:
  - Organization ID availability
  - Request loading process
  - Raw data received from service
  - Data transformation steps

### 2. Enhance pto.ts Service
- Add detailed logging for:
  - Query construction steps
  - Raw data received from Supabase
  - Data transformation process
  - Any errors that occur

### 3. Implementation Plan
1. Switch to Code mode
2. Update PTOContext.tsx first to fix the filtering issue
3. Add comprehensive logging
4. Test the changes
5. Monitor the logs to ensure data flow is working correctly

## Next Steps
1. Switch to Code mode to implement these changes
2. Test with different request statuses
3. Verify all requests are displaying correctly