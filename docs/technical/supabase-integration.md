# Supabase Integration Plan

This document outlines the implementation plan for integrating ClockFlow with Supabase for data storage, authentication, and real-time features.

## 1. Project Setup

### 1.1 Supabase Project Creation
1. Create new Supabase project
2. Save project credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### 1.2 Client Setup
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
```

## 2. Database Schema

### 2.1 Core Tables

```sql
-- Users and Authentication
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  department TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  break_duration INTEGER DEFAULT 0,
  job_location_id UUID REFERENCES job_locations,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Locations
CREATE TABLE job_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius INTEGER, -- Geofencing radius in meters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PTO Requests
CREATE TABLE pto_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  total_hours NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE
);
```

### 2.2 Row Level Security (RLS)

```sql
-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Time Entries RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...
```

## 3. Implementation Phases

### Phase 1: Authentication & User Management
1. **Setup Auth UI**
   ```typescript
   // src/components/auth/AuthUI.tsx
   import { Auth } from '@supabase/auth-ui-react';
   import { ThemeSupa } from '@supabase/auth-ui-shared';
   
   export function AuthUI() {
     return (
       <Auth
         supabaseClient={supabase}
         appearance={{ theme: ThemeSupa }}
         providers={['google']}
       />
     );
   }
   ```

2. **User Context**
   ```typescript
   // src/contexts/UserContext.tsx
   export function UserProvider({ children }: Props) {
     const [user, setUser] = useState<User | null>(null);
     
     useEffect(() => {
       // Get initial session
       supabase.auth.getSession().then(({ data: { session } }) => {
         setUser(session?.user ?? null);
       });
       
       // Listen for auth changes
       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (_event, session) => {
           setUser(session?.user ?? null);
         }
       );
       
       return () => subscription.unsubscribe();
     }, []);
     
     return (
       <UserContext.Provider value={{ user }}>
         {children}
       </UserContext.Provider>
     );
   }
   ```

### Phase 2: Time Entry System
1. **Time Entry Service**
   ```typescript
   // src/services/timeEntries.ts
   export async function createTimeEntry(entry: TimeEntry) {
     const { data, error } = await supabase
       .from('time_entries')
       .insert({
         user_id: entry.userId,
         start_time: entry.startTime,
         end_time: entry.endTime,
         break_duration: entry.breakDuration,
         job_location_id: entry.jobLocationId,
         notes: entry.notes
       });
       
     if (error) throw error;
     return data;
   }
   ```

2. **Real-time Updates**
   ```typescript
   // src/hooks/useTimeEntries.ts
   export function useTimeEntries(userId: string) {
     const [entries, setEntries] = useState<TimeEntry[]>([]);
     
     useEffect(() => {
       // Initial fetch
       fetchTimeEntries();
       
       // Subscribe to changes
       const subscription = supabase
         .from('time_entries')
         .on('*', payload => {
           handleTimeEntryChange(payload);
         })
         .subscribe();
         
       return () => {
         subscription.unsubscribe();
       };
     }, [userId]);
     
     return entries;
   }
   ```

### Phase 3: Job Locations & Geofencing
1. **Location Service**
   ```typescript
   // src/services/locations.ts
   export async function createJobLocation(location: JobLocation) {
     const { data, error } = await supabase
       .from('job_locations')
       .insert(location);
       
     if (error) throw error;
     return data;
   }
   
   export function checkInGeofence(
     userLat: number,
     userLng: number,
     location: JobLocation
   ): boolean {
     const distance = calculateDistance(
       userLat,
       userLng,
       location.latitude,
       location.longitude
     );
     return distance <= location.radius;
   }
   ```

### Phase 4: PTO Management
1. **PTO Service**
   ```typescript
   // src/services/pto.ts
   export async function submitPTORequest(request: PTORequest) {
     const { data, error } = await supabase
       .from('pto_requests')
       .insert(request);
       
     if (error) throw error;
     
     // Notify approvers
     await notifyApprovers(data);
     
     return data;
   }
   ```

### Phase 5: Timesheet System
1. **Timesheet Generation**
   ```typescript
   // src/services/timesheets.ts
   export async function generateTimesheet(userId: string, period: Period) {
     // Get time entries for period
     const { data: entries } = await supabase
       .from('time_entries')
       .select('*')
       .eq('user_id', userId)
       .gte('start_time', period.start)
       .lte('end_time', period.end);
       
     // Calculate totals
     const totalHours = calculateTotalHours(entries);
     
     // Create timesheet
     const { data, error } = await supabase
       .from('timesheets')
       .insert({
         user_id: userId,
         period_start: period.start,
         period_end: period.end,
         total_hours: totalHours
       });
       
     if (error) throw error;
     return data;
   }
   ```

## 4. Data Migration Plan

### 4.1 Migration Steps
1. Export existing data to JSON format
2. Transform data to match new schema
3. Import data using Supabase's REST API
4. Verify data integrity

```typescript
// scripts/migrate.ts
async function migrateData() {
  // 1. Export existing data
  const existingData = await exportExistingData();
  
  // 2. Transform data
  const transformedData = transformData(existingData);
  
  // 3. Import to Supabase
  for (const table of Object.keys(transformedData)) {
    await supabase
      .from(table)
      .insert(transformedData[table]);
  }
  
  // 4. Verify
  await verifyMigration(transformedData);
}
```

## 5. Testing Strategy

### 5.1 Unit Tests
```typescript
// src/services/__tests__/timeEntries.test.ts
describe('Time Entry Service', () => {
  it('should create time entry', async () => {
    const entry = mockTimeEntry();
    const result = await createTimeEntry(entry);
    expect(result).toMatchObject(entry);
  });
});
```

### 5.2 Integration Tests
```typescript
// src/tests/integration/supabase.test.ts
describe('Supabase Integration', () => {
  it('should handle auth flow', async () => {
    const { user, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(error).toBeNull();
    expect(user).toBeDefined();
  });
});
```

## 6. Security Considerations

### 6.1 Environment Variables
```env
# .env.example
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 6.2 Security Headers
```typescript
// src/middleware/security.ts
export const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; connect-src 'self' https://*.supabase.co;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff'
};
```

## 7. Monitoring and Maintenance

### 7.1 Error Tracking
```typescript
// src/lib/errorTracking.ts
export function trackSupabaseError(error: any) {
  console.error('Supabase Error:', error);
  
  // Send to error tracking service
  Sentry.captureException(error, {
    tags: {
      source: 'supabase'
    }
  });
}
```

### 7.2 Performance Monitoring
```typescript
// src/lib/performance.ts
export function trackQueryPerformance(
  queryName: string,
  startTime: number
) {
  const duration = performance.now() - startTime;
  
  // Log to monitoring service
  logQueryMetric(queryName, duration);
}
```

## 8. Rollout Plan

### Phase 1 (Week 1-2)
- Set up Supabase project
- Implement authentication
- Create core database schema
- Set up RLS policies

### Phase 2 (Week 3-4)
- Implement time entry system
- Set up real-time subscriptions
- Create location services
- Begin data migration

### Phase 3 (Week 5-6)
- Implement PTO management
- Create timesheet system
- Complete data migration
- Conduct testing

### Phase 4 (Week 7-8)
- Deploy to staging
- Conduct user acceptance testing
- Fix issues and optimize
- Deploy to production

## 9. Rollback Plan

### 9.1 Database Backup
```sql
-- Before major changes
CREATE EXTENSION IF NOT EXISTS pg_dump;
SELECT pg_dump_all();
```

### 9.2 Version Control
```typescript
// Keep track of migrations
const MIGRATION_VERSION = '1.0.0';

async function rollback() {
  await revertMigration(MIGRATION_VERSION);
  await restoreBackup();
}
```

## 10. Success Metrics

- Authentication success rate > 99.9%
- Query performance < 100ms
- Real-time sync delay < 500ms
- Zero data loss during migration
- All existing features functional
- User session persistence
- Successful geolocation tracking
