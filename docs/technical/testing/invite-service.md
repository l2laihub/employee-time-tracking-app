# Invite Service Testing

This document outlines the testing strategy and implementation for the Invite Service, which handles organization invites and member signups in ClockFlow.

## Test Framework

The Invite Service tests use the following testing stack:
- **Vitest**: Main testing framework
- **Vi**: Mocking library (part of Vitest)
- **Supabase**: Database service being mocked

## Test Structure

Tests are located in `src/services/__tests__/invites.test.ts` and test the functionality in `src/services/invites.ts`.

### Mock Setup

The tests use Vi's mocking capabilities to mock the Supabase client:

```typescript
vi.mock('../../lib/supabase')
```

Each test case sets up specific mock implementations for the Supabase query builder to simulate different database operations and responses.

## Test Cases

### 1. Creating New Invites

Tests the ability to create new organization invites:

```typescript
it('creates invite with admin permissions', async () => {
  // Tests successful creation of an admin invite
  // Verifies:
  // - Successful invite creation
  // - Correct invite ID returned
})
```

### 2. User Signup Flow

Tests the process of users signing up with existing invites:

```typescript
it('redirects invited user to organization dashboard on signup', async () => {
  // Tests successful signup with existing invite
  // Verifies:
  // - Invite validation
  // - Organization membership creation
  // - Correct dashboard redirection
})
```

### 3. Error Handling

Tests error scenarios:

```typescript
it('handles missing invite during signup', async () => {
  // Tests signup attempt without valid invite
  // Verifies:
  // - Proper error handling
  // - Appropriate error message
})
```

## Mock Implementations

### Query Builder Mock

The tests use a consistent query builder mock structure:

```typescript
const mockQueryBuilder = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockResolvedValue({
    data: [{ id: 'invite-123' }],
    error: null
  }),
  eq: vi.fn().mockReturnThis()
  // ... other methods
};
```

### Database Response Mocks

Different test scenarios use specific mock responses:

1. Successful Creation:
   ```typescript
   {
     data: [{ id: 'invite-123' }],
     error: null
   }
   ```

2. Error Case:
   ```typescript
   {
     data: null,
     error: { message: 'No invite found' }
   }
   ```

## Running Tests

To run invite service tests specifically:

```bash
npm run test:unit src/services/__tests__/invites.test.ts
```

To run as part of all unit tests:

```bash
npm run test:unit
```
