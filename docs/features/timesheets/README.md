# Timesheets

The Timesheet module in ClockFlow manages the creation, submission, and approval of employee timesheets.

## Features

### 1. Automated Generation
- Automatic compilation of time entries
- Period-based generation (weekly, bi-weekly, monthly)
- Overtime calculation
- Break time tracking
- Multiple time entry types

### 2. Multi-level Approval
- Configurable approval chains
- Manager review process
- Bulk approval capabilities
- Comment and revision system
- Status tracking

### 3. Export Capabilities
- PDF generation
- Excel export
- Payroll system integration
- Custom format support
- Batch export

## Implementation

### 1. Timesheet Generation

```typescript
interface Timesheet {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entries: TimeEntry[];
  approvers: string[];
  comments: Comment[];
  submittedAt?: Date;
  approvedAt?: Date;
}

async function generateTimesheet(userId: string, period: TimePeriod): Promise<Timesheet> {
  // Get time entries for period
  const entries = await getTimeEntriesForPeriod(userId, period);
  
  // Calculate hours
  const hours = calculateHours(entries);
  
  // Create timesheet
  const timesheet: Timesheet = {
    userId,
    startDate: period.start,
    endDate: period.end,
    status: 'draft',
    entries,
    ...hours,
    approvers: await getApprovers(userId)
  };
  
  return saveTimesheet(timesheet);
}
```

### 2. Approval Workflow

```typescript
async function submitTimesheet(timesheetId: string): Promise<void> {
  const timesheet = await getTimesheet(timesheetId);
  
  // Validate timesheet
  validateTimesheet(timesheet);
  
  // Update status
  await updateTimesheetStatus(timesheetId, 'submitted');
  
  // Notify approvers
  await notifyApprovers(timesheet);
}

async function approveTimesheet(
  timesheetId: string,
  approverId: string,
  comment?: string
): Promise<void> {
  const timesheet = await getTimesheet(timesheetId);
  
  // Check approver permission
  if (!canApprove(approverId, timesheet)) {
    throw new Error('Unauthorized approval attempt');
  }
  
  // Update approval status
  await updateApprovalStatus(timesheetId, approverId, 'approved');
  
  // Add comment if provided
  if (comment) {
    await addTimesheetComment(timesheetId, approverId, comment);
  }
  
  // Check if fully approved
  const isFullyApproved = await checkFullApproval(timesheetId);
  if (isFullyApproved) {
    await finalizeTimesheet(timesheetId);
  }
}
```

### 3. Export Functions

```typescript
interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeDetails: boolean;
  periodStart: Date;
  periodEnd: Date;
  employeeIds?: string[];
}

async function exportTimesheets(options: ExportOptions): Promise<Buffer> {
  // Get timesheets
  const timesheets = await getTimesheetsForExport(options);
  
  // Format data
  const formattedData = formatTimesheetData(timesheets, options);
  
  // Generate export
  switch (options.format) {
    case 'pdf':
      return generatePDF(formattedData);
    case 'excel':
      return generateExcel(formattedData);
    case 'csv':
      return generateCSV(formattedData);
    default:
      throw new Error('Unsupported export format');
  }
}
```

## User Interface

### 1. Timesheet Form

```tsx
function TimesheetForm({ timesheet }: Props) {
  const form = useForm<Timesheet>({
    defaultValues: timesheet
  });
  
  const onSubmit = async (data: Timesheet) => {
    try {
      if (data.status === 'draft') {
        await submitTimesheet(data.id);
      } else {
        await updateTimesheet(data);
      }
      showSuccess('Timesheet updated successfully');
    } catch (error) {
      showError(error.message);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <TimesheetHeader timesheet={timesheet} />
      <TimeEntryList
        entries={timesheet.entries}
        readOnly={timesheet.status !== 'draft'}
      />
      <TimesheetSummary hours={timesheet} />
      <ApprovalChain approvers={timesheet.approvers} />
      <CommentSection comments={timesheet.comments} />
      <TimesheetActions status={timesheet.status} />
    </form>
  );
}
```

### 2. Approval Interface

```tsx
function ApprovalInterface({ timesheet }: Props) {
  const { user } = useAuth();
  const canApprove = useCanApprove(timesheet, user.id);
  
  const handleApprove = async () => {
    try {
      await approveTimesheet(timesheet.id, user.id);
      showSuccess('Timesheet approved');
    } catch (error) {
      showError(error.message);
    }
  };
  
  const handleReject = async (comment: string) => {
    try {
      await rejectTimesheet(timesheet.id, user.id, comment);
      showSuccess('Timesheet rejected');
    } catch (error) {
      showError(error.message);
    }
  };
  
  return (
    <div className="approval-interface">
      <TimesheetSummary timesheet={timesheet} />
      <TimeEntryList entries={timesheet.entries} readOnly />
      <CommentSection comments={timesheet.comments} />
      {canApprove && (
        <div className="approval-actions">
          <Button onClick={handleApprove}>Approve</Button>
          <RejectButton onReject={handleReject} />
        </div>
      )}
    </div>
  );
}
```

## Database Schema

```sql
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_hours DECIMAL(10,2),
  regular_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE timesheet_approvers (
  timesheet_id UUID REFERENCES timesheets(id),
  approver_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (timesheet_id, approver_id)
);

CREATE TABLE timesheet_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID REFERENCES timesheets(id),
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Business Logic

### 1. Hour Calculations

```typescript
function calculateTimesheetHours(entries: TimeEntry[]) {
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  
  entries.forEach(entry => {
    const duration = calculateDuration(entry.startTime, entry.endTime);
    totalHours += duration;
    
    if (isOvertime(entry)) {
      overtimeHours += calculateOvertimePortion(duration);
      regularHours += calculateRegularPortion(duration);
    } else {
      regularHours += duration;
    }
  });
  
  return {
    totalHours,
    regularHours,
    overtimeHours
  };
}
```

### 2. Validation Rules

```typescript
function validateTimesheet(timesheet: Timesheet): void {
  // Check period
  if (!isValidPayPeriod(timesheet.startDate, timesheet.endDate)) {
    throw new Error('Invalid pay period');
  }
  
  // Validate entries
  timesheet.entries.forEach(validateTimeEntry);
  
  // Check total hours
  if (timesheet.totalHours <= 0) {
    throw new Error('Timesheet must have hours logged');
  }
  
  // Verify no gaps
  if (hasTimeGaps(timesheet.entries)) {
    throw new Error('Timesheet has unexplained time gaps');
  }
  
  // Check approvers
  if (timesheet.approvers.length === 0) {
    throw new Error('Timesheet must have at least one approver');
  }
}
```

## Integration Points

### 1. Payroll Integration

```typescript
async function exportToPayroll(timesheet: Timesheet): Promise<void> {
  const payrollData = {
    employeeId: timesheet.userId,
    period: {
      start: timesheet.startDate,
      end: timesheet.endDate
    },
    earnings: [
      {
        code: 'REG',
        hours: timesheet.regularHours,
        rate: await getEmployeeRate(timesheet.userId)
      },
      {
        code: 'OT',
        hours: timesheet.overtimeHours,
        rate: await getOvertimeRate(timesheet.userId)
      }
    ]
  };
  
  await payrollService.submitPayData(payrollData);
}
```

### 2. Notification System

```typescript
async function notifyApprovers(timesheet: Timesheet): Promise<void> {
  const approvers = await getApprovers(timesheet.userId);
  
  const notifications = approvers.map(approver => ({
    userId: approver.id,
    type: 'timesheet_approval',
    title: 'Timesheet Pending Approval',
    message: `Timesheet for ${timesheet.startDate} - ${timesheet.endDate} requires your approval`,
    data: {
      timesheetId: timesheet.id
    }
  }));
  
  await sendNotifications(notifications);
}
```
