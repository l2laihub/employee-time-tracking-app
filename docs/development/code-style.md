# Code Style Guide

This document outlines the coding standards and best practices for the ClockFlow application.

## General Principles

1. **Consistency**
   - Follow existing patterns in the codebase
   - Use consistent naming conventions
   - Maintain consistent file structure

2. **Readability**
   - Write self-documenting code
   - Use meaningful variable and function names
   - Keep functions small and focused

3. **Maintainability**
   - Follow SOLID principles
   - Write testable code
   - Document complex logic

## TypeScript Guidelines

### Types and Interfaces

```typescript
// Use interfaces for objects that represent entities
interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

// Use type for unions, intersections, and simple types
type UserRole = 'admin' | 'manager' | 'employee';
type ButtonSize = 'small' | 'medium' | 'large';

// Use generics when appropriate
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
```

### Naming Conventions

```typescript
// PascalCase for types, interfaces, and classes
interface TimeEntry { }
class TimeEntryService { }

// camelCase for variables, functions, and methods
const currentUser: User;
function calculateTotalHours(): number { }

// Use descriptive names
// Bad
const d = new Date();
// Good
const startDate = new Date();
```

### Type Assertions

```typescript
// Prefer type assertions with 'as'
const user = response.data as User;

// Use type guards when possible
function isUser(obj: any): obj is User {
  return 'id' in obj && 'email' in obj;
}
```

## React Components

### Functional Components

```typescript
// Use function declarations for components
function UserProfile({ user }: UserProfileProps) {
  return (
    <div>
      <h1>{user.fullName}</h1>
    </div>
  );
}

// Use arrow functions for handlers
const handleSubmit = (event: React.FormEvent) => {
  event.preventDefault();
};
```

### Props

```typescript
// Define prop types as interfaces
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// Use destructuring for props
function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

### Hooks

```typescript
// Place hooks at the top of the component
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { data } = useQuery(['users'], fetchUsers);

  // Rest of the component...
}

// Custom hooks should start with 'use'
function useTimeEntry(id: string) {
  // Hook implementation...
}
```

## File Organization

### Component Files

```typescript
// ComponentName.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { User } from '@/types';
import { fetchUser } from '@/services/api';

interface Props {
  userId: string;
}

export function UserDetails({ userId }: Props) {
  // Component implementation...
}
```

### Directory Structure

```
components/
  Button/
    Button.tsx
    Button.test.tsx
    Button.types.ts
    index.ts
```

## CSS/Styling

### Tailwind Classes

```typescript
// Group related classes
const buttonClasses = clsx(
  'px-4 py-2 rounded-md', // spacing and shape
  'bg-blue-500 text-white', // colors
  'hover:bg-blue-600 active:bg-blue-700', // interactions
  'disabled:opacity-50 disabled:cursor-not-allowed' // states
);

// Use consistent ordering
const cardClasses = clsx(
  // Layout
  'flex flex-col',
  // Spacing
  'p-4 gap-2',
  // Colors
  'bg-white',
  // Border
  'rounded-lg border border-gray-200',
  // States
  'hover:border-blue-500'
);
```

## State Management

### Redux

```typescript
// Action Types
const ADD_TIME_ENTRY = 'timeEntry/add';

// Action Creators
const addTimeEntry = (entry: TimeEntry) => ({
  type: ADD_TIME_ENTRY,
  payload: entry,
});

// Reducers
const timeEntryReducer = (state: TimeEntryState, action: TimeEntryAction) => {
  switch (action.type) {
    case ADD_TIME_ENTRY:
      return {
        ...state,
        entries: [...state.entries, action.payload],
      };
    default:
      return state;
  }
};
```

## Testing

### Unit Tests

```typescript
describe('TimeEntry', () => {
  it('should calculate total hours correctly', () => {
    const entry = new TimeEntry({
      startTime: '2023-01-01T09:00:00Z',
      endTime: '2023-01-01T17:00:00Z',
    });

    expect(entry.getTotalHours()).toBe(8);
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button label="Click me" onClick={onClick} />);

    await userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Documentation

### Comments

```typescript
// Use JSDoc for function documentation
/**
 * Calculates the total hours worked in a time entry
 * @param startTime - The start time of the entry
 * @param endTime - The end time of the entry
 * @returns The total hours worked
 */
function calculateHours(startTime: Date, endTime: Date): number {
  // Implementation...
}

// Use inline comments sparingly, only for complex logic
function processTimeEntry(entry: TimeEntry) {
  // Adjust for timezone differences
  const localStartTime = convertToLocalTime(entry.startTime);
  
  // Calculate overtime based on weekly hours
  const overtime = calculateOvertime(entry);
}
```

## Git Commit Messages

```
feat: add time entry approval workflow
fix: correct overtime calculation
docs: update API documentation
style: format time entry component
refactor: simplify PTO calculation logic
test: add tests for time entry validation
```

## Error Handling

```typescript
try {
  await saveTimeEntry(entry);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    showValidationError(error.message);
  } else if (error instanceof ApiError) {
    // Handle API errors
    showApiError(error.message);
  } else {
    // Handle unexpected errors
    logError(error);
    showGenericError();
  }
}
```

## Performance Considerations

1. **Memoization**
   ```typescript
   const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
   ```

2. **Code Splitting**
   ```typescript
   const TimeEntryForm = lazy(() => import('./TimeEntryForm'));
   ```

3. **Virtual Lists**
   ```typescript
   import { VirtualList } from '@/components/VirtualList';
   
   function TimeEntryList({ entries }: Props) {
     return (
       <VirtualList
         items={entries}
         renderItem={(entry) => <TimeEntryRow entry={entry} />}
       />
     );
   }
   ```
