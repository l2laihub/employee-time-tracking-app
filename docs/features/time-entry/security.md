# Time Entry Security & Best Practices

## Access Control

### User Authentication
- All time entry operations require authenticated users
- JWT tokens used for API requests
- Session management through Supabase Auth

### Authorization
```sql
-- Row Level Security (RLS) Policies
CREATE POLICY "Users can only view their own time entries"
ON time_entries
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = time_entries.organization_id
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can only create their own time entries"
ON time_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = time_entries.organization_id
  )
);

CREATE POLICY "Users can only update their own time entries"
ON time_entries
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);
```

### Organization Context
- Time entries are scoped to organizations
- Users can only access entries within their organization
- Managers have additional viewing privileges

## Data Protection

### Input Validation
```typescript
function validateTimeEntry(entry: TimeEntry): boolean {
  // Required fields
  if (!entry.user_id || !entry.job_location_id || !entry.start_time) {
    return false;
  }

  // Valid dates
  if (!isValid(parseISO(entry.start_time))) {
    return false;
  }
  if (entry.end_time && !isValid(parseISO(entry.end_time))) {
    return false;
  }

  // Valid status
  const validStatuses = ['working', 'break', 'completed'];
  if (!validStatuses.includes(entry.status)) {
    return false;
  }

  // Break duration validation
  if (entry.break_duration && entry.break_duration < 0) {
    return false;
  }

  return true;
}
```

### Data Sanitization
```typescript
function sanitizeTimeEntry(entry: TimeEntry): TimeEntry {
  return {
    ...entry,
    notes: entry.notes ? sanitizeHtml(entry.notes) : undefined,
    start_time: entry.start_time.trim(),
    end_time: entry.end_time?.trim(),
    break_duration: Math.max(0, entry.break_duration || 0)
  };
}
```

## Best Practices

### Time Entry Creation
1. **Validation**
   - Verify user is not already clocked in
   - Validate location is within geofence
   - Check for valid organization membership

2. **Data Integrity**
   - Use UTC timestamps
   - Store duration calculations
   - Maintain audit trail

3. **Error Prevention**
   - Prevent duplicate entries
   - Validate date ranges
   - Check for overlapping entries

### Break Management
1. **Duration Tracking**
   - Accurate break timing
   - Maximum break duration limits
   - Break frequency monitoring

2. **Status Updates**
   - Atomic status changes
   - Prevent invalid transitions
   - Clear status indicators

### Data Access
1. **Query Optimization**
   - Use appropriate indexes
   - Implement pagination
   - Cache frequent queries

2. **Data Retention**
   - Archive old entries
   - Maintain compliance records
   - Regular backups

## Usage Guidelines

### Time Entry
1. Clock in at start of work
2. Record breaks accurately
3. Add detailed notes
4. Verify location
5. Clock out at end of work

### Break Management
1. Start breaks promptly
2. End breaks on time
3. Monitor break duration
4. Follow break policies

### Data Management
1. Regular data review
2. Prompt error correction
3. Maintain accurate records
4. Follow retention policies
