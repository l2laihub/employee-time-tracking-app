# PTO Feature Test Plan

## Overview
This document outlines the testing strategy for the PTO Request feature's migration from mock data to Supabase integration.

## Unit Tests

### Service Layer (✅ Completed)
- `src/services/__tests__/pto.test.ts`
  - Create PTO request
    - Success case with proper data
    - Error handling
  - Update request status
    - Success case for approval/rejection
    - Error handling
  - Delete request
    - Success case
    - Error handling
  - List requests
    - Success case with filters
    - Error handling

### Context Layer
- `src/contexts/__tests__/PTOContext.test.tsx`
  - Initial state loading
  - Balance calculations
    - Vacation balance with different service years
    - Sick leave based on worked hours
  - Request management
    - Adding new requests
    - Updating request status
    - Deleting requests
  - Error states
  - Loading states

### Component Layer
- `src/components/pto/__tests__/UserPTOBalance.test.tsx`
  - Balance display
    - Vacation balance
    - Sick leave balance
  - Loading states
  - Error states
  - Allocation text display

## Integration Tests

### Database Integration
- Schema validation
- RLS policy effectiveness
- Data consistency
- Transaction handling

### Feature Workflows
1. Request Creation Flow
   - Submit new request
   - Validate balance deduction
   - Check notifications

2. Request Management Flow
   - Manager approval
   - Manager rejection
   - Employee cancellation
   - Balance updates

3. Balance Calculation Flow
   - Vacation accrual
   - Sick leave accrual
   - Used hours tracking
   - Pending hours handling

### Permission Tests
- Employee permissions
  - View own requests
  - Submit new requests
  - Cancel pending requests
- Manager permissions
  - View team requests
  - Approve/reject requests
  - View team balances
- Admin permissions
  - View all requests
  - Manage all requests
  - Configure settings

## End-to-End Tests

### Happy Paths
1. New Employee PTO
   - First year pro-rated vacation
   - Initial sick leave accrual
   - Submit first request

2. Existing Employee PTO
   - Second year vacation balance
   - Accumulated sick leave
   - Multiple requests

3. Manager Operations
   - Review team requests
   - Batch approvals
   - Balance monitoring

### Error Paths
1. Request Validation
   - Insufficient balance
   - Invalid date range
   - Missing fields

2. Permission Boundaries
   - Cross-organization access
   - Role-based restrictions
   - Data isolation

3. Edge Cases
   - Zero balance requests
   - Maximum balance limits
   - Date boundary conditions

## Performance Tests

### Load Testing
- Multiple concurrent requests
- Large data set handling
- Response time monitoring

### Data Volume Tests
- Large number of requests
- Historical data handling
- Balance calculation speed

## Security Tests

### RLS Policies
- Organization isolation
- User data privacy
- Role-based access

### Input Validation
- SQL injection prevention
- Data sanitization
- Type validation

## Manual Testing Checklist

### UI/UX Verification
- [ ] Balance display accuracy
- [ ] Loading indicators
- [ ] Error messages
- [ ] Form validation
- [ ] Responsive design

### Functionality Verification
- [ ] Request submission
- [ ] Status updates
- [ ] Balance calculations
- [ ] Filter/search
- [ ] Export/reports

### Error Handling
- [ ] Network errors
- [ ] Validation errors
- [ ] Permission errors
- [ ] Timeout handling

## Test Environment Setup

### Development
```bash
# Run migrations
supabase migration up

# Seed test data
psql -f scripts/seed_test_pto_data.sql

# Run tests
npm run test
```

### Staging
```bash
# Deploy schema
supabase db push

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Success Metrics

1. Test Coverage
   - Service layer: 100%
   - Context layer: 90%+
   - Component layer: 80%+

2. Performance Metrics
   - Request response: < 500ms
   - Balance calculation: < 200ms
   - List operation: < 1s for 1000 records

3. Error Rates
   - Failed requests: < 0.1%
   - Invalid calculations: 0%
   - Data inconsistencies: 0%

## Rollback Criteria

1. Critical Issues
   - Data loss or corruption
   - Security vulnerabilities
   - Performance degradation > 100%

2. Functional Issues
   - Balance calculation errors
   - Permission failures
   - Integration failures

## Sign-off Requirements

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance metrics met
- [ ] Security review completed
- [ ] Manual testing checklist completed
- [ ] No critical bugs open
- [ ] Documentation updated
