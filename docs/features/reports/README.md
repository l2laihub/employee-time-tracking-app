# Reports

The Reports module in ClockFlow provides analytics and reporting capabilities for employee time tracking data.

## Features

### Employee Hours Report

The primary report showing employee working hours and time off:

#### Core Features
- Weekly hours breakdown by day
- Regular and overtime hours tracking
- PTO tracking (vacation and sick leave)
- Interactive employee detail view
- CSV export capabilities

#### Filtering Options
- Date range selection
- Job location filtering
- Status-based filtering
- Organization-level data isolation

### Data Structure

```typescript
interface WeeklyEmployeeHours {
  id: string;
  name: string;
  jobLocationIds: string[];
  hours: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  totalRegular: number;
  totalOT: number;
  vacationHours: number;
  sickLeaveHours: number;
  vacationBalance: number;
  sickLeaveBalance: number;
}

interface EmployeeTimeEntry {
  date: string;
  timeIn: string;
  lunchStart: string;
  lunchEnd: string;
  timeOut: string;
  totalHours: number;
  lunchBreak: number;
  workedHours: number;
  jobLocation: string;
  status: string;
}
```

### Implementation

#### Report Generation

```typescript
interface ReportFilters {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  jobLocationIds?: string[];
}

async function getWeeklyHours(filters: ReportFilters): Promise<WeeklyEmployeeHours[]> {
  // Fetch data from weekly_employee_hours view
  const { data, error } = await supabase
    .rpc('get_weekly_employee_hours', {
      start_date: filters.startDate,
      end_date: filters.endDate,
      org_id: organizationId
    });

  if (error) throw error;
  return processWeeklyHours(data);
}
```

#### Employee Detail View

```typescript
async function getEmployeeDetails(
  employeeId: string,
  filters: ReportFilters
): Promise<EmployeeTimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      job_locations (
        name
      )
    `)
    .eq('employee_id', employeeId)
    .gte('clock_in', filters.startDate)
    .lte('clock_in', filters.endDate);

  if (error) throw error;
  return processTimeEntries(data);
}
```

### Export Capabilities

#### CSV Export

```typescript
async function exportWeeklySummaryToCSV(filters: ReportFilters): Promise<string> {
  const data = await getWeeklyHours(filters);
  
  const headers = [
    'Employee',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
    'Regular Hours',
    'Overtime',
    'Vacation Hours',
    'Sick Leave Hours',
    'Vacation Balance',
    'Sick Leave Balance'
  ];

  const rows = data.map(employee => [
    employee.name,
    employee.hours.monday,
    employee.hours.tuesday,
    employee.hours.wednesday,
    employee.hours.thursday,
    employee.hours.friday,
    employee.hours.saturday,
    employee.hours.sunday,
    employee.totalRegular,
    employee.totalOT,
    employee.vacationHours,
    employee.sickLeaveHours,
    employee.vacationBalance,
    employee.sickLeaveBalance
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}
```

### Debug Capabilities

For troubleshooting weekly hours calculations:

```typescript
async function debugWeeklyHours(
  employeeId: string,
  filters: ReportFilters
): Promise<any> {
  const { data, error } = await supabase
    .rpc('debug_weekly_hours', {
      start_date: filters.startDate,
      end_date: filters.endDate,
      org_id: organizationId,
      employee_id: employeeId
    });

  if (error) throw error;
  return data;
}
```

## Integration Points

### Time Entry System
- Pulls clock in/out times
- Calculates worked hours
- Tracks break times
- Handles job locations

### PTO System
- Vacation hours tracking
- Sick leave tracking
- Balance calculations
- Leave type categorization

### Organization System
- Automatic organization context
- Role-based access control
- Data isolation by organization

## Future Enhancements
- Additional report types (Cost Analysis, Location Reports)
- Enhanced export formats (PDF, Excel)
- Advanced data visualization
- Custom report builder
- Scheduled report delivery
