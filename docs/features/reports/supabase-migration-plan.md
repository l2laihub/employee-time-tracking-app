# Reports Feature Supabase Migration Plan

## Current Implementation Analysis

### Data Structure
The reports feature currently uses mock data with the following key interfaces:

```typescript
interface WeeklyEmployeeHours {
  id: string;
  name: string;
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

### Current Components
- Reports.tsx (main page)
- EmployeeHoursReport.tsx (primary report component)
- Supporting components:
  - WeeklyHoursTable
  - EmployeeDetailView
  - DateRangePicker
  - ExportButton
  - FilterBar

## Implementation Plan

### 1. Database Schema Updates

#### Required Tables
- time_entries (existing)
- employees (existing)
- job_locations (existing)
- organizations (existing)

#### New Views
```sql
-- Weekly hours summary view
CREATE VIEW weekly_employee_hours AS
SELECT 
  e.id,
  e.name,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 1 THEN te.worked_hours ELSE 0 END) as monday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 2 THEN te.worked_hours ELSE 0 END) as tuesday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 3 THEN te.worked_hours ELSE 0 END) as wednesday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 4 THEN te.worked_hours ELSE 0 END) as thursday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 5 THEN te.worked_hours ELSE 0 END) as friday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 6 THEN te.worked_hours ELSE 0 END) as saturday,
  SUM(CASE WHEN EXTRACT(DOW FROM te.date) = 0 THEN te.worked_hours ELSE 0 END) as sunday,
  SUM(CASE WHEN te.worked_hours <= 8 THEN te.worked_hours ELSE 8 END) as total_regular,
  SUM(CASE WHEN te.worked_hours > 8 THEN te.worked_hours - 8 ELSE 0 END) as total_ot,
  SUM(CASE WHEN te.type = 'vacation' THEN te.worked_hours ELSE 0 END) as vacation_hours,
  SUM(CASE WHEN te.type = 'sick' THEN te.worked_hours ELSE 0 END) as sick_leave_hours
FROM 
  employees e
  LEFT JOIN time_entries te ON e.id = te.employee_id
WHERE 
  te.date >= :start_date 
  AND te.date <= :end_date
  AND e.organization_id = :org_id
GROUP BY 
  e.id, e.name;
```

### 2. Service Layer Implementation

Create a new reports service module:

```typescript
// src/services/reports.ts

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  jobLocationIds?: string[];
  status?: string[];
}

export class ReportsService {
  // Get weekly hours summary
  async getWeeklyHours(filters: ReportFilters): Promise<WeeklyEmployeeHours[]> {
    const { data, error } = await supabase
      .from('weekly_employee_hours')
      .select('*')
      .gte('date', filters.startDate.toISOString())
      .lte('date', filters.endDate.toISOString())
      .in('employee_id', filters.employeeIds)
      .in('job_location_id', filters.jobLocationIds)
      .in('status', filters.status);

    if (error) throw error;
    return data;
  }

  // Get detailed employee time entries
  async getEmployeeDetails(
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
      .gte('date', filters.startDate.toISOString())
      .lte('date', filters.endDate.toISOString());

    if (error) throw error;
    return data;
  }
}
```

### 3. Component Updates

#### Phase 1: Service Integration
1. Create new ReportsContext for managing report state and data fetching
2. Update EmployeeHoursReport to use ReportsContext instead of mock data
3. Implement loading states and error handling
4. Add proper typing for all data structures

#### Phase 2: UI Enhancements
1. Add loading spinners during data fetch
2. Implement error boundaries
3. Add retry mechanisms for failed requests
4. Enhance filtering capabilities using Supabase query builders

### 4. Testing Strategy

#### Unit Tests
```typescript
// src/services/__tests__/reports.test.ts

describe('ReportsService', () => {
  it('should fetch weekly hours with filters', async () => {
    const service = new ReportsService();
    const result = await service.getWeeklyHours({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07')
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('totalRegular');
  });

  it('should handle empty results', async () => {
    const service = new ReportsService();
    const result = await service.getWeeklyHours({
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-07')
    });
    expect(result).toHaveLength(0);
  });
});
```

#### Integration Tests
1. Test data aggregation accuracy
2. Verify organization-level data isolation
3. Test all filter combinations
4. Verify export functionality

### 5. Migration Steps

1. Database Updates
   - Create new database views
   - Add necessary indexes
   - Verify query performance

2. Backend Implementation
   - Implement ReportsService
   - Add comprehensive error handling
   - Add proper typing

3. Frontend Updates
   - Create ReportsContext
   - Update components to use real data
   - Add loading states
   - Implement error handling

4. Testing
   - Run unit tests
   - Perform integration testing
   - Verify data accuracy
   - Test performance

5. Deployment
   - Deploy database changes
   - Deploy application updates
   - Monitor performance
   - Watch for errors

### 6. Rollback Plan

1. Keep mock data implementation as fallback
2. Implement feature flags for gradual rollout
3. Monitor error rates and performance metrics
4. Prepare rollback scripts for database changes

## Success Criteria

1. All reports show accurate data from Supabase
2. Performance matches or exceeds mock data implementation
3. Proper error handling and loading states
4. All existing functionality preserved
5. Data properly scoped to organization context
6. Export functionality working with real data
7. All tests passing

## Timeline

1. Database Schema Updates: 2 days
2. Service Layer Implementation: 2 days
3. Component Updates: 3 days
4. Testing: 2 days
5. Deployment and Monitoring: 1 day

Total: 10 working days