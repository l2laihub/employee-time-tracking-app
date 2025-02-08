# Timesheet Feature Implementation Plan

## Overview
This document outlines the plan for implementing the timesheet feature following a simplified approach based on the successful patterns used in the job-locations feature.

## Goals
- Simplify timesheet and time entry management
- Improve performance through database-level optimizations
- Reduce coupling between components
- Maintain clear separation of concerns
- Follow established patterns from job-locations feature

## Database Schema

### Timesheets Table
```sql
CREATE TABLE timesheets (
    id UUID PRIMARY KEY,
    organization_id UUID,
    employee_id UUID,
    period_start_date DATE,
    period_end_date DATE,
    status VARCHAR(20),
    total_hours DECIMAL(10,2),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
```

### Time Entries Table
```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY,
    organization_id UUID,
    employee_id UUID,
    job_location_id UUID,
    entry_date DATE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
```

## Implementation Steps

### 1. Database Layer (Completed)
- [x] Create migration for timesheet and time entry tables
- [x] Implement RLS policies for security
- [x] Add database triggers for automatic total calculations
- [x] Add constraints and validation checks

### 2. Types Layer (Completed)
- [x] Define TypeScript interfaces for timesheets and time entries
- [x] Add database type definitions
- [x] Define result types for service operations

### 3. Services Layer (Completed)
- [x] Create timesheet service (`src/services/timesheets.ts`)
  - [x] Create timesheet
  - [x] Get timesheet by ID
  - [x] List timesheets for employee
  - [x] List timesheets for organization
  - [x] Update timesheet status
  - [x] Add review notes
- [x] Create time entry service (`src/services/timeEntries.ts`)
  - [x] Create time entry
  - [x] Update time entry
  - [x] Delete time entry
  - [x] List time entries by timesheet
  - [x] List time entries by date range

### 4. Context Layer (Completed)
- [x] Create TimesheetContext (`src/contexts/TimesheetContext.tsx`)
  - [x] Timesheet state management
  - [x] Time entry state management
  - [x] Loading states
  - [x] Error handling

### 5. Components Layer (Next)
- [ ] Create base components
  - [ ] TimesheetList
  - [ ] TimesheetDetail
  - [ ] TimeEntryForm
  - [ ] TimeEntryList
- [ ] Create view components
  - [ ] EmployeeTimesheetView
  - [ ] AdminTimesheetView
  - [ ] TimesheetReviewView

### 6. Pages Layer
- [ ] Update Timesheets page (`src/pages/Timesheets.tsx`)
  - [ ] Employee view
  - [ ] Admin view
  - [ ] Review workflow

## Key Improvements Over Previous Implementation

1. **Simplified State Management**
   - Clear separation between timesheet and time entry states
   - Database-level total calculations
   - Reduced client-side complexity

2. **Better Performance**
   - Optimized database queries
   - Automatic total calculations via triggers
   - Reduced data fetching

3. **Cleaner Code Organization**
   - Following established patterns
   - Clear separation of concerns
   - Consistent error handling

4. **Enhanced Security**
   - Comprehensive RLS policies
   - Clear permission boundaries
   - Validated data constraints

## Testing Strategy

1. **Database Tests**
   - Trigger functionality
   - RLS policy effectiveness
   - Constraint validation

2. **Service Tests**
   - CRUD operations
   - Error handling
   - Edge cases

3. **Integration Tests**
   - End-to-end workflows
   - State management
   - UI interactions

## Current Status
- Database migration completed
- Types layer completed
- Services layer completed
- Context layer completed
- Ready to implement components layer

## Next Steps
1. Develop UI components
2. Implement pages layer

## Notes
- Following job-locations pattern for consistency
- Using database triggers for automatic calculations
- Maintaining clear separation between timesheets and time entries
- Implementing proper error handling at all layers