# Time Entry

The Time Entry module is a core component of ClockFlow that handles all aspects of time tracking.

## Features

### 1. Clock In/Out
- One-click time entry
- Location tracking
- Job/task association
- Break management
- Overtime tracking

### 2. Time Entry Types
```typescript
interface TimeEntry {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  jobLocationId: string;
  breakDuration: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  category?: string;
}
```

### 3. Break Management
- Start/end breaks
- Break duration tracking
- Break type categorization
- Compliance monitoring
- Automatic calculations

### 4. Location Tracking
- GPS integration
- Geofencing
- Location verification
- Site assignment
- Travel time tracking

### 5. Notes and Categories
- Task descriptions
- Project associations
- Billable status
- Client attribution
- Custom fields

## Implementation

### 1. Time Entry Creation

```typescript
async function createTimeEntry(entry: TimeEntry) {
  // Validate entry
  validateTimeEntry(entry);
  
  // Check for overlaps
  const hasOverlap = await checkOverlappingEntries(
    entry.userId,
    entry.startTime,
    entry.endTime
  );
  
  if (hasOverlap) {
    throw new Error('Time entry overlaps with existing entry');
  }
  
  // Create entry
  const { data, error } = await supabase
    .from('time_entries')
    .insert(entry);
    
  if (error) throw error;
  
  // Update related records
  await Promise.all([
    updateUserStatus(entry.userId),
    notifyManagers(entry),
    updateTimesheets(entry)
  ]);
  
  return data;
}
```

### 2. Break Management

```typescript
interface Break {
  id: string;
  timeEntryId: string;
  startTime: Date;
  endTime?: Date;
  type: 'lunch' | 'rest' | 'other';
  notes?: string;
}

async function startBreak(timeEntryId: string, type: string) {
  const break: Break = {
    timeEntryId,
    startTime: new Date(),
    type
  };
  
  const { data, error } = await supabase
    .from('breaks')
    .insert(break);
    
  if (error) throw error;
  
  // Update time entry
  await updateTimeEntryBreakDuration(timeEntryId);
  
  return data;
}
```

### 3. Location Tracking

```typescript
interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

function useLocationTracking() {
  const [location, setLocation] = useState<Location | null>(null);
  
  useEffect(() => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        });
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  
  return location;
}
```

### 4. Validation

```typescript
function validateTimeEntry(entry: TimeEntry) {
  // Check required fields
  if (!entry.startTime || !entry.userId || !entry.jobLocationId) {
    throw new Error('Missing required fields');
  }
  
  // Validate time range
  if (entry.endTime && entry.endTime <= entry.startTime) {
    throw new Error('End time must be after start time');
  }
  
  // Check working hours
  const duration = calculateDuration(entry.startTime, entry.endTime);
  if (duration > MAX_HOURS_PER_DAY) {
    throw new Error('Exceeds maximum daily hours');
  }
  
  // Validate location
  if (!isValidLocation(entry.jobLocationId)) {
    throw new Error('Invalid job location');
  }
}
```

## User Interface

### 1. Time Entry Form

```tsx
function TimeEntryForm() {
  const form = useForm<TimeEntry>({
    defaultValues: {
      startTime: new Date(),
      breakDuration: 0,
      status: 'pending'
    }
  });
  
  const onSubmit = async (data: TimeEntry) => {
    try {
      await createTimeEntry(data);
      showSuccess('Time entry created');
    } catch (error) {
      showError(error.message);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <DateTimePicker
        label="Start Time"
        {...form.register('startTime')}
      />
      <DateTimePicker
        label="End Time"
        {...form.register('endTime')}
      />
      <LocationSelect
        {...form.register('jobLocationId')}
      />
      <TextArea
        label="Notes"
        {...form.register('notes')}
      />
      <Button type="submit">Save Entry</Button>
    </form>
  );
}
```

### 2. Active Timer

```tsx
function ActiveTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setElapsed((now.getTime() - startTime.current.getTime()) / 1000);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="timer">
      <div className="elapsed">{formatTime(elapsed)}</div>
      <Button onClick={handleStop}>Stop</Button>
      <Button onClick={handleBreak}>Break</Button>
    </div>
  );
}
```

## Data Storage

### 1. Database Schema

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  job_location_id UUID REFERENCES job_locations(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  break_duration INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(start_time);
```

### 2. Queries

```typescript
async function getTimeEntries(userId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      job_locations (
        name,
        address
      )
    `)
    .eq('user_id', userId)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time', { ascending: false });
    
  if (error) throw error;
  return data;
}
```

## Business Logic

### 1. Overtime Calculation

```typescript
function calculateOvertime(
  regularHours: number,
  overtimeThreshold: number = 40
): number {
  return Math.max(0, regularHours - overtimeThreshold);
}

function calculateWeeklyHours(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    const duration = calculateDuration(
      entry.startTime,
      entry.endTime
    );
    return total + duration;
  }, 0);
}
```

### 2. Break Enforcement

```typescript
function enforceBreakRules(timeEntry: TimeEntry): void {
  const duration = calculateDuration(
    timeEntry.startTime,
    timeEntry.endTime
  );
  
  // Check if break is required
  if (duration > 6 && !timeEntry.breakDuration) {
    throw new Error('Break required for shifts over 6 hours');
  }
  
  // Validate break duration
  if (timeEntry.breakDuration < MINIMUM_BREAK_DURATION) {
    throw new Error('Break duration below minimum requirement');
  }
}
```

## Integration Points

### 1. Payroll Integration

```typescript
async function exportToPayroll(
  startDate: Date,
  endDate: Date
): Promise<PayrollExport> {
  const entries = await getTimeEntries(startDate, endDate);
  
  const payrollData = entries.map(entry => ({
    employeeId: entry.userId,
    date: entry.startTime,
    regularHours: calculateRegularHours(entry),
    overtimeHours: calculateOvertimeHours(entry),
    jobCode: entry.jobLocationId
  }));
  
  return formatPayrollExport(payrollData);
}
```

### 2. Reporting Integration

```typescript
interface TimeReport {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakTime: number;
  locations: Record<string, number>;
}

async function generateTimeReport(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeReport> {
  const entries = await getTimeEntries(userId, startDate, endDate);
  
  return {
    totalHours: calculateTotalHours(entries),
    regularHours: calculateRegularHours(entries),
    overtimeHours: calculateOvertimeHours(entries),
    breakTime: calculateTotalBreakTime(entries),
    locations: summarizeLocations(entries)
  };
}
```

### Time Entry Feature

## Overview

The Time Entry feature enables employees to track their work hours accurately, manage breaks, and associate their time with specific job locations. This feature is fundamental for organizations requiring precise time tracking, break management, and location-based verification of work hours.

## Documentation Structure

1. [Architecture](./architecture.md)
   - Service design and components
   - Data structures
   - Integration points

2. [Core Features](./core-features.md)
   - Time entry management
   - Break handling
   - Location verification
   - Notes and descriptions

3. [Implementation](./implementation.md)
   - Code examples
   - Error handling
   - Performance considerations

4. [Security & Best Practices](./security.md)
   - Access control
   - Data protection
   - Usage guidelines

## Key Components

### Time Entry Service
The Time Entry service (`src/services/timeEntries.ts`) handles all time-tracking operations:

```typescript
interface TimeEntry {
  id: string;
  user_id: string;
  job_location_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  break_duration?: number;
  status: 'working' | 'break' | 'completed';
  organization_id: string;
  created_at: string;
  updated_at: string;
}
```

### Key Features
1. **Clock In/Out**
   - One-click time entry
   - Location verification
   - Job location association

2. **Break Management**
   - Start/end breaks
   - Break duration tracking
   - Automatic calculations

3. **Time Entry List**
   - Date-based grouping
   - Pagination support
   - Filtering by status and location
   - Mobile-responsive UI

4. **Notes and Descriptions**
   - Task descriptions
   - Work details
   - Searchable content

## Quick Links

- [Technical Documentation](../../technical/testing/time-entry-service.md)
- [API Reference](./api-reference.md)
- [Future Roadmap](./roadmap.md)
