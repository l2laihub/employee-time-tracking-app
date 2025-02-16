# Job Location Service Testing

This document outlines the testing strategy and implementation for the Job Location Service, which handles location management and user assignments in ClockFlow.

## Test Framework

The Job Location Service tests use the following testing stack:
- **Vitest**: Main testing framework
- **Vi**: Mocking library (part of Vitest)
- **Supabase**: Database service being mocked

## Test Structure

Tests are located in `src/services/__tests__/jobLocations.test.ts` and test the functionality in `src/services/jobLocations.ts`.

### Mock Setup

The tests use Vi's mocking capabilities to mock the Supabase client:

```typescript
vi.mock('../../lib/supabase')
```

Each test case sets up specific mock implementations for the Supabase query builder to simulate different database operations and responses.

### Important Mock Patterns

#### 1. Single Operation Mocks
For simple operations that return immediately:

```typescript
const mockQueryBuilder = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: mockLocation,
    error: null
  })
};
```

#### 2. Chained Operation Mocks
For operations that require method chaining:

```typescript
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis()
};

// Handle multiple chained calls
mockQueryBuilder.eq
  .mockImplementationOnce(() => mockQueryBuilder) // First call returns this
  .mockImplementationOnce(() => Promise.resolve(mockResponse)); // Last call returns data
```

## Test Cases

### 1. Location Management

#### Creating Locations
```typescript
it('creates a new location successfully', async () => {
  // Tests successful creation with all required fields
  // Verifies:
  // - Location data structure
  // - Success response
  // - Correct parameters passed to database
})

it('handles creation failure', async () => {
  // Tests error handling during creation
  // Verifies:
  // - Error response format
  // - Error message propagation
})
```

#### Updating Locations
```typescript
it('updates location successfully', async () => {
  // Tests partial updates to existing locations
  // Verifies:
  // - Update operation success
  // - Updated fields
  // - Response format
})
```

#### Listing Locations
```typescript
it('lists all active locations for organization', async () => {
  // Tests retrieval of organization locations
  // Verifies:
  // - Active locations filter
  // - Organization filter
  // - Array response format
})
```

### 2. User Assignment Management

#### Assigning Users
```typescript
it('assigns user to location as primary', async () => {
  // Tests user assignment to locations
  // Verifies:
  // - Primary location handling
  // - Assignment data structure
  // - Previous assignments update
})
```

#### Retrieving User Locations
```typescript
it('retrieves user locations with assignments', async () => {
  // Tests getting user's assigned locations
  // Verifies:
  // - Location data with assignment info
  // - Active assignments only
})
```

## Error Handling

### Database Errors
Tests verify proper handling of various database error scenarios:

```typescript
const mockError = { message: 'Database error' };
const mockQueryBuilder = {
  // ... mock setup
  single: vi.fn().mockResolvedValue({
    data: null,
    error: mockError
  })
};

// Verify error handling
expect(result.success).toBe(false);
expect(result.error).toBe(mockError.message);
```

### Validation Errors
Tests ensure proper validation of input parameters:
- Required fields
- Data types
- Location name and address format
- Organization ID validation

## Running Tests

To run job location service tests specifically:

```bash
npm run test:unit src/services/__tests__/jobLocations.test.ts
```

To run as part of all unit tests:

```bash
npm run test:unit
```

## Common Testing Patterns

1. **Mock Data Setup**
   ```typescript
   const mockLocation: Location = {
     id: 'loc-123',
     name: 'Main Office',
     address: '123 Main St, City, State',
     organization_id: 'org-123',
     is_active: true,
     created_at: '2025-01-26T08:00:00Z',
     updated_at: '2025-01-26T08:00:00Z'
   };
   ```

2. **Mock Reset**
   ```typescript
   beforeEach(() => {
     vi.resetAllMocks();
   });
   ```

3. **Assertion Patterns**
   ```typescript
   // Success case assertions
   expect(result.success).toBe(true);
   expect(result.data).toEqual(expectedData);
   
   // Error case assertions
   expect(result.success).toBe(false);
   expect(result.error).toMatch(/expected error message/i);
   
   // Function call assertions
   expect(mockQueryBuilder.method).toHaveBeenCalledWith(expectedArgs);
   ```

## Future Enhancements Testing

The following test cases will be implemented when location tracking features are added:

### 1. Geofencing
- Location boundary validation
- Distance calculation
- GPS coordinate validation
- Location verification during clock in/out

### 2. GPS Integration
- Location tracking accuracy
- Real-time location updates
- Location history tracking
- Travel time calculation
