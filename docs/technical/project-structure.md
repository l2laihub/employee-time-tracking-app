# Project Structure

This document outlines the organization and structure of the ClockFlow codebase.

## Directory Structure

```
employee-time-tracking-app/
├── docs/                    # Documentation files
├── public/                  # Static assets
├── src/                     # Source code
│   ├── components/         # Reusable React components
│   │   ├── common/        # Shared components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── forms/         # Form components
│   │   └── layout/        # Layout components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and service functions
│   ├── store/             # State management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── App.tsx            # Root component
├── supabase/              # Supabase configuration and migrations
├── .env                   # Environment variables
├── package.json           # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Key Components and Their Responsibilities

### Components (`src/components/`)

- **common/**: Reusable UI components like buttons, inputs, and modals
- **dashboard/**: Components specific to the dashboard feature
- **forms/**: Form-related components and validation logic
- **layout/**: Page layout components like headers and navigation

### Pages (`src/pages/`)

Each page component represents a route in the application:
- `Overview.tsx`: Landing/marketing page
- `Dashboard.tsx`: Main dashboard view
- `TimeEntry.tsx`: Time tracking interface
- `PTO.tsx`: PTO management
- `Reports.tsx`: Reporting interface

### Services (`src/services/`)

API and external service integrations:
- `api.ts`: API client setup and configuration
- `auth.ts`: Authentication service
- `time.ts`: Time tracking service
- `reports.ts`: Reporting service

### Store (`src/store/`)

State management using Redux:
- `slices/`: Redux slices for different features
- `actions/`: Redux actions
- `reducers/`: Redux reducers
- `selectors/`: Redux selectors

### Hooks (`src/hooks/`)

Custom React hooks:
- `useAuth.ts`: Authentication hooks
- `useTimeEntry.ts`: Time tracking hooks
- `usePTO.ts`: PTO management hooks

### Utils (`src/utils/`)

Utility functions and helpers:
- `date.ts`: Date formatting and manipulation
- `validation.ts`: Form validation helpers
- `formatting.ts`: Data formatting utilities

## Code Organization Principles

1. **Feature-First Organization**
   - Related code is grouped by feature
   - Each feature has its own components, hooks, and services

2. **Component Structure**
   - Components follow atomic design principles
   - Each component has its own directory with:
     - Component file (TSX)
     - Styles (if needed)
     - Tests
     - Types

3. **State Management**
   - Global state in Redux store
   - Local state with React hooks
   - Cached data with React Query

4. **Type Safety**
   - TypeScript used throughout
   - Strict type checking enabled
   - Shared types in `types/` directory

## Best Practices

1. **File Naming**
   - Use PascalCase for components
   - Use camelCase for utilities and hooks
   - Use kebab-case for documentation

2. **Import Organization**
   - Group imports by type:
     1. External libraries
     2. Components
     3. Hooks
     4. Utils
     5. Types
     6. Styles

3. **Component Guidelines**
   - One component per file
   - Keep components focused and single-responsibility
   - Use TypeScript interfaces for props

4. **Testing Structure**
   - Tests alongside components
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)

## Contributing

When adding new code:
1. Follow existing patterns and conventions
2. Update documentation as needed
3. Add appropriate tests
4. Update this document if structure changes
