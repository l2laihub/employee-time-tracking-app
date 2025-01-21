# Configuration Guide

This guide covers all configuration options and settings for the ClockFlow application.

## Environment Variables

### Core Configuration
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Settings
VITE_APP_NAME=ClockFlow
VITE_APP_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api

# Feature Flags
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_GEOLOCATION=true
VITE_ENABLE_OFFLINE_MODE=true

# Authentication
VITE_AUTH_COOKIE_LIFETIME=604800
VITE_AUTH_REFRESH_INTERVAL=3600

# Time Settings
VITE_DEFAULT_TIMEZONE=America/Los_Angeles
VITE_WORK_WEEK_START=1
VITE_WORK_WEEK_END=5
VITE_WORK_DAY_START=9
VITE_WORK_DAY_END=17
```

### Optional Settings
```env
# Analytics
VITE_ANALYTICS_KEY=your_analytics_key
VITE_ENABLE_ANALYTICS=true

# Error Reporting
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ENABLE_ERROR_REPORTING=true

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_PERFORMANCE_SAMPLE_RATE=0.1
```

## Application Settings

### Time Tracking Settings

```typescript
// src/config/timeTracking.ts
export const timeTrackingConfig = {
  minimumEntryDuration: 15, // minutes
  maximumEntryDuration: 24 * 60, // minutes
  breakIntervals: [15, 30, 45, 60], // minutes
  roundingInterval: 15, // minutes
  allowFutureEntries: false,
  allowOverlappingEntries: false,
};
```

### PTO Settings

```typescript
// src/config/pto.ts
export const ptoConfig = {
  minRequestDuration: 0.5, // days
  maxRequestDuration: 14, // days
  requestLeadTime: 7, // days
  allowNegativeBalance: false,
  autoApprovalThreshold: 3, // days
};
```

### Notification Settings

```typescript
// src/config/notifications.ts
export const notificationConfig = {
  enableEmailNotifications: true,
  enablePushNotifications: true,
  notificationTypes: {
    timeEntryReminders: true,
    ptoApprovals: true,
    timesheetDeadlines: true,
    systemAnnouncements: true,
  },
  reminderSchedule: {
    timesheet: {
      daysBeforeDeadline: [1, 3],
      timeOfDay: '09:00',
    },
  },
};
```

## Security Settings

### Authentication

```typescript
// src/config/auth.ts
export const authConfig = {
  sessionDuration: 24 * 60 * 60, // seconds
  refreshTokenDuration: 7 * 24 * 60 * 60, // seconds
  passwordPolicy: {
    minLength: 8,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
    requireLowercase: true,
  },
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60, // seconds
};
```

### API Security

```typescript
// src/config/api.ts
export const apiConfig = {
  rateLimiting: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  cors: {
    allowedOrigins: ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowCredentials: true,
  },
};
```

## Feature Configuration

### Geolocation Settings

```typescript
// src/config/geolocation.ts
export const geolocationConfig = {
  enabled: true,
  maxDistance: 100, // meters
  updateInterval: 5 * 60, // seconds
  accuracy: {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  },
};
```

### Report Settings

```typescript
// src/config/reports.ts
export const reportConfig = {
  exportFormats: ['csv', 'pdf', 'xlsx'],
  maxExportRows: 10000,
  defaultDateRange: 30, // days
  caching: {
    enabled: true,
    duration: 60 * 60, // seconds
  },
};
```

## Development Settings

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          components: ['@/components'],
        },
      },
    },
  },
});
```

### Testing Configuration

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Configuration Management

### Environment-Specific Settings

Create separate `.env` files for different environments:
- `.env.development`
- `.env.test`
- `.env.production`

### Configuration Validation

```typescript
// src/config/validation.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  // ... other validations
});

export function validateConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration:', result.error);
    throw new Error('Invalid configuration');
  }
}
```

## Updating Configuration

1. **Local Development**
   - Modify `.env.development` file
   - Update relevant config files in `src/config/`

2. **Production Updates**
   - Use environment variables in deployment platform
   - Update through CI/CD pipeline
   - Document changes in changelog

3. **Best Practices**
   - Never commit sensitive values
   - Use placeholder values in example files
   - Document all configuration options
   - Validate configuration at startup
