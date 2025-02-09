# Timesheet Feature API Reference

## Service Layer API

### Timesheet Service

#### Create Timesheet
```typescript
async function createTimesheet(params: {
  organizationId: string;
  employeeId: string;
  periodStartDate: string;
  periodEndDate: string;
}): Promise<TimesheetResult>
```

Example:
```typescript
const result = await createTimesheet({
  organizationId: 'org-123',
  employeeId: 'emp-456',
  periodStartDate: '2025-02-03',
  periodEndDate: '2025-02-09'
});
```

#### Get Timesheet
```typescript
async function getTimesheet(timesheetId: string): Promise<TimesheetResult>
```

Example:
```typescript
const result = await getTimesheet('timesheet-123');
```

#### List Timesheets
```typescript
async function listTimesheets(params: {
  organizationId: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimesheetStatus;
}): Promise<TimesheetResult>
```

Example:
```typescript
const result = await listTimesheets({
  organizationId: 'org-123',
  startDate: '2025-01-01',
  status: 'submitted'
});
```

#### Update Timesheet Status
```typescript
async function updateTimesheetStatus(params: {
  timesheetId: string;
  status: TimesheetStatus;
  notes?: string;
}): Promise<TimesheetResult>
```

Example:
```typescript
const result = await updateTimesheetStatus({
  timesheetId: 'timesheet-123',
  status: 'approved',
  notes: 'All entries verified'
});
```

### Time Entry Service

#### Create Time Entry
```typescript
async function createTimeEntry(params: {
  organizationId: string;
  employeeId: string;
  jobLocationId: string;
  entryDate: string;
  startTime: string;
  endTime?: string;
  breakDuration?: number;
  notes?: string;
}): Promise<TimeEntryResult>
```

Example:
```typescript
const result = await createTimeEntry({
  organizationId: 'org-123',
  employeeId: 'emp-456',
  jobLocationId: 'loc-789',
  entryDate: '2025-02-05',
  startTime: '2025-02-05T09:00:00Z',
  endTime: '2025-02-05T17:00:00Z',
  breakDuration: 30,
  notes: 'Regular maintenance work'
});
```

#### Update Time Entry
```typescript
async function updateTimeEntry(
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntryResult>
```

Example:
```typescript
const result = await updateTimeEntry('entry-123', {
  endTime: '2025-02-05T18:00:00Z',
  breakDuration: 45
});
```

#### List Time Entries
```typescript
async function listTimeEntries(params: {
  organizationId: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TimeEntryResult>
```

Example:
```typescript
const result = await listTimeEntries({
  organizationId: 'org-123',
  employeeId: 'emp-456',
  startDate: '2025-02-01',
  endDate: '2025-02-07'
});
```

## React Context API

### TimesheetContext

#### Provider Setup
```tsx
function App() {
  return (
    <TimesheetProvider>
      <YourComponents />
    </TimesheetProvider>
  );
}
```

#### Hook Usage
```tsx
function TimesheetList() {
  const {
    timesheets,
    loading,
    error,
    fetchTimesheets,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet
  } = useTimesheet();

  // Example usage
  useEffect(() => {
    fetchTimesheets({
      organizationId: currentOrg,
      startDate: weekStart
    });
  }, [currentOrg, weekStart]);

  return (
    // Your component JSX
  );
}
```

## Database Queries

### Common Timesheet Queries

#### Get Employee's Current Timesheet
```sql
SELECT t.*,
       COALESCE(SUM(
         CASE 
           WHEN te.end_time IS NOT NULL 
           THEN calculate_hours(te.start_time, te.end_time, te.break_duration)
           ELSE 0
         END
       ), 0) as total_hours
FROM timesheets t
LEFT JOIN time_entries te ON te.employee_id = t.employee_id
WHERE t.employee_id = :employee_id
AND t.period_start_date <= CURRENT_DATE
AND t.period_end_date >= CURRENT_DATE
GROUP BY t.id;
```

#### List Pending Review Timesheets
```sql
SELECT t.*,
       e.first_name,
       e.last_name,
       e.department
FROM timesheets t
JOIN employees e ON e.id = t.employee_id
WHERE t.organization_id = :organization_id
AND t.status = 'submitted'
ORDER BY t.submitted_at ASC;
```

## Error Handling

### Service Layer Errors
```typescript
interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

// Example error handling
try {
  const result = await createTimeEntry({...});
  if (!result.success) {
    // Handle error based on result.error
  }
} catch (error) {
  // Handle unexpected errors
}
```

### Database Constraints
```sql
-- Example constraint violation
INSERT INTO time_entries (...)
VALUES (...); -- Throws error if entry_date not within timesheet period
```

## Testing Examples

### Service Tests
```typescript
describe('TimesheetService', () => {
  it('should create timesheet with valid data', async () => {
    const result = await createTimesheet({...});
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });

  it('should handle invalid date ranges', async () => {
    const result = await createTimesheet({
      periodEndDate: '2025-02-01',
      periodStartDate: '2025-02-07' // Invalid: end before start
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid date range/i);
  });
});
```

### Component Tests
```typescript
describe('TimesheetList', () => {
  it('should display timesheet entries', async () => {
    render(<TimesheetList />);
    await screen.findByText('Week of Feb 3, 2025');
    expect(screen.getByText('40.0 hours')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<TimesheetList />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

## Usage Examples

### Complete Workflow Example
```typescript
// 1. Create timesheet for the week
const timesheet = await createTimesheet({
  organizationId,
  employeeId,
  periodStartDate: '2025-02-03',
  periodEndDate: '2025-02-09'
});

// 2. Add time entries
const entry1 = await createTimeEntry({
  organizationId,
  employeeId,
  jobLocationId,
  entryDate: '2025-02-03',
  startTime: '2025-02-03T09:00:00Z',
  endTime: '2025-02-03T17:00:00Z'
});

// 3. Submit timesheet for review
const submitted = await updateTimesheetStatus({
  timesheetId: timesheet.data.id,
  status: 'submitted'
});

// 4. Approve timesheet
const approved = await updateTimesheetStatus({
  timesheetId: timesheet.data.id,
  status: 'approved',
  notes: 'All entries verified'
});