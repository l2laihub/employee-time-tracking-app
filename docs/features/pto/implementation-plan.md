# PTO Feature Implementation Plan

## Overview
This document outlines the plan to replace the mock data implementation of the PTO Request feature with Supabase data store integration.

## 1. Current State Analysis

### Data Structure
- Location: `src/lib/mockPTOData.ts`
- Data Model:
  ```typescript
  interface PTORequest {
    id: string;
    organization_id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick_leave';
    hours: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    created_at: string;
    created_by?: string;
    reviewed_by?: string;
    reviewed_at?: string;
  }
  ```

### Business Logic
- Vacation balance calculation based on:
  - Years of service (40 hours first year, 80 hours after)
  - Pro-rated for partial years
  - Considers used and pending hours
- Sick leave accrual:
  - 1 hour per 40 hours worked
  - Based on approved timesheets
  - Considers used and pending hours
- Request workflow:
  - Creation with validation
  - Status management (pending → approved/rejected)
  - Balance updates on status changes
- Multi-tenancy support via organization_id

## 2. Implementation Steps

### 1. Database Schema (✅ Completed)
Created in `supabase/migrations/20250210_create_pto_requests.sql`:
- Base table structure with proper constraints
- RLS policies for security
- Indexes for performance

Updated in `supabase/migrations/20250210_update_pto_requests.sql`:
- Added missing columns
- Updated type constraints
- Added documentation

### 2. Service Layer (✅ Completed)
Created in `src/services/pto.ts`:
- CRUD operations for PTO requests
- Type-safe responses
- Error handling
- Multi-tenancy support

Added tests in `src/services/__tests__/pto.test.ts`:
- Coverage for all operations
- Error cases
- Mock Supabase responses

### 3. Context Updates (✅ Completed)
Updated `src/contexts/PTOContext.tsx`:
- Replaced mock data with service calls
- Maintained existing interface
- Added loading/error states
- Kept business logic intact

### 4. Component Updates (✅ Completed)
Updated `src/components/pto/UserPTOBalance.tsx`:
- Handles async balance calculations
- Shows loading states
- Handles errors gracefully
- Maintains current UI

## 3. Testing Strategy

### Unit Tests
- Service layer tests ✅
- Context tests
- Component tests

### Integration Tests
- PTO request workflow
- Balance calculations
- Error handling
- Permission checks

### Manual Testing
- Create PTO request
- Approve/reject requests
- View balances
- Filter requests
- Error scenarios

## 4. Migration Process

1. Run Database Migrations
   ```bash
   supabase migration up
   ```

2. Deploy Updated Schema
   ```bash
   supabase db push
   ```

3. Verify RLS Policies
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pto_requests';
   ```

4. Test in Development
   - Run the application locally
   - Test all PTO operations
   - Verify balances calculate correctly
   - Check error handling

5. Remove Mock Data
   - After successful verification
   - Remove `src/lib/mockPTOData.ts`
   - Update imports

## 5. Success Criteria

1. All existing functionality works with real data
2. Performance meets requirements
3. Error handling is robust
4. Security policies are enforced
5. No regressions in existing features

## 6. Rollback Plan

1. Keep mock data implementation until verified
2. Database rollback script ready
3. Feature flags if needed

## 7. Timeline

1. Database Setup: 1.5 days
   - Core schema: 0.5 day
   - Policies: 0.5 day
   - Testing: 0.5 day

2. Service Implementation: 2 days
   - Core functions: 1 day
   - Testing: 1 day

3. Context/Component Updates: 2 days
   - Context migration: 1 day
   - Component updates: 0.5 day
   - Testing: 0.5 day

4. Migration: 1.5 days
   - Data migration: 0.5 day
   - Verification: 0.5 day
   - Cleanup: 0.5 day

Total: 7 days

## Notes

- Maintain exact feature parity
- Focus on data layer replacement
- No UI/UX changes
- Keep existing business logic
- Follow current patterns

## References

- [Migration Guide](./migration.md)
- [Test Plan](./test-plan.md)
- [Database Schema](../../technical/database-schema.md)
