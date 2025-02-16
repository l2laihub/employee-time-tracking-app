# Time Entry

The Time Entry module is a core component of ClockFlow that handles all aspects of time tracking.

## Features

### 1. Clock In/Out
- One-click time entry
- Job/task association
- Break management
- Overtime tracking

### 2. Time Entry Types
```typescript
interface TimeEntry {
  id: string;
  user_id: string;
  organization_id: string;
  job_location_id: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  service_type: 'hvac' | 'plumbing' | 'both';
  work_description: string;
  status: 'active' | 'break' | 'completed';
}
```

### 3. Break Management
- Start/end breaks
- Break duration tracking
- Break type categorization
- Compliance monitoring
- Automatic calculations

### 4. Notes and Categories
- Task descriptions
- Project associations
- Billable status
- Client attribution
- Custom fields

## Future Enhancements

### 1. Location Tracking
The following location tracking features are planned for future implementation:
- GPS integration for clock in/out verification
- Geofencing for job site validation
- Location verification for time entries
- Site assignment automation
- Travel time tracking between job sites

## Implementation

### 1. Time Entry Creation

```typescript
function validateTimeEntry(entry: Partial<TimeEntry>) {
  if (!entry.user_id) {
    throw new Error('User ID is required');
  }
  if (!entry.organization_id) {
    throw new Error('Organization ID is required');
  }
  if (!entry.job_location_id) {
    throw new Error('Job location ID is required');
  }
  if (!entry.service_type) {
    throw new Error('Service type is required');
  }
  if (!['hvac', 'plumbing', 'both'].includes(entry.service_type)) {
    throw new Error('Service type must be one of: hvac, plumbing, both');
  }
}

export async function createTimeEntry(entry: Partial<TimeEntry>): Promise<TimeEntryResult> {
  try {
    // Validate the entry
    validateTimeEntry(entry);

    // Get current time
    const now = new Date();

    const timeEntryData = {
      user_id: entry.user_id,
      organization_id: entry.organization_id,
      job_location_id: entry.job_location_id,
      service_type: entry.service_type,
      clock_in: now.toISOString(),
      clock_out: null,
      break_start: null,
      break_end: null,
      status: 'active' as const,
      work_description: entry.work_description || 'No description provided',
      total_break_minutes: 0
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntryData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned after insert');

    return {
      success: true,
      data: data as TimeEntry
    };
  } catch (error) {
    console.error('Time entry creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
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

### 3. Validation

```typescript
function validateTimeEntry(entry: Partial<TimeEntry>) {
  // Check required fields
  if (!entry.user_id) {
    throw new Error('User ID is required');
  }
  if (!entry.organization_id) {
    throw new Error('Organization ID is required');
  }
  if (!entry.job_location_id) {
    throw new Error('Job location ID is required');
  }
  if (!entry.service_type) {
    throw new Error('Service type is required');
  }
  
  // Validate service type
  if (!['hvac', 'plumbing', 'both'].includes(entry.service_type)) {
    throw new Error('Service type must be one of: hvac, plumbing, both');
  }
}
```

## User Interface

### 1. Time Entry Form

```tsx
export default function TimeEntry() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const { activeEntry, setActiveEntry } = useTimeEntry();

  const handleClockIn = async () => {
    if (!selectedJobId || !user?.id || !organization?.id) return;

    try {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (!selectedJob) {
        setError('Selected job not found');
        return;
      }

      const result = await createTimeEntry({
        user_id: user.id,
        organization_id: organization.id,
        job_location_id: selectedJobId,
        service_type: selectedJob.service_type,
        work_description: notes || 'No description provided'
      });

      if (result.success) {
        setActiveEntry(result.data);
        setError(undefined);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Clock in error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while clocking in');
    }
  };

  return (
    <div className="space-y-6">
      <JobSelector
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelect={setSelectedJobId}
        disabled={!!activeEntry}
      />
      <NotesField
        value={notes}
        onChange={setNotes}
        disabled={!selectedJobId}
      />
      <TimeControls
        isActive={!!activeEntry}
        isOnBreak={activeEntry?.status === 'break'}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onStartBreak={handleStartBreak}
        onEndBreak={handleEndBreak}
      />
    </div>
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
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_location_id UUID NOT NULL REFERENCES job_locations(id),
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_break_minutes INTEGER DEFAULT 0,
  service_type TEXT NOT NULL CHECK (service_type IN ('hvac', 'plumbing', 'both')),
  work_description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'break', 'completed')),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_break_times CHECK (
    (break_start IS NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  ),
  CONSTRAINT valid_clock_times CHECK (
    (clock_out IS NULL) OR
    (clock_out > clock_in)
  )
);

CREATE INDEX time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX time_entries_organization_id_idx ON time_entries(organization_id);
CREATE INDEX time_entries_clock_in_idx ON time_entries(clock_in);
CREATE INDEX time_entries_status_idx ON time_entries(status);
```

### 2. Queries

```typescript
export async function listTimeEntriesByDateRange(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntryResult> {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `)
      .eq('user_id', employeeId)
      .gte('clock_in', startDate.toISOString())
      .lte('clock_in', endDate.toISOString())
      .order('clock_in', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data as TimeEntry[]
    };
  } catch (error) {
    console.error('Failed to list time entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
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

The Time Entry feature enables employees to track their work hours accurately, manage breaks, and associate their time with specific job locations. This feature is fundamental for organizations requiring precise time tracking and break management.

## Documentation Structure

1. [Architecture](./architecture.md)
   - Service design and components
   - Data structures
   - Integration points

2. [Core Features](./core-features.md)
   - Time entry management
   - Break handling
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
