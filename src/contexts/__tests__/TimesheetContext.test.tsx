import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { TimesheetProvider, useTimesheets } from '../TimesheetContext'
import * as timesheetService from '../../services/timesheets'
import * as timeEntryService from '../../services/timeEntries'
import * as employeeService from '../../services/employees'
import { useOrganization } from '../OrganizationContext'
import { useEmployees } from '../EmployeeContext'
import { useAuth } from '../AuthContext'
import React from 'react'
import type { Timesheet, TimeEntry, TimesheetStatus } from '../../types/custom.types'
import type { Employee } from '../../lib/types'

// Mock the service modules
vi.mock('../../services/timesheets')
vi.mock('../../services/timeEntries')
vi.mock('../../services/employees')
vi.mock('../OrganizationContext')
vi.mock('../EmployeeContext')
vi.mock('../AuthContext')

interface TestComponentProps {
  onContextReady?: (context: ReturnType<typeof useTimesheets>) => void;
}

// Test component to access context
function TestComponent({ onContextReady }: TestComponentProps = {}) {
  const context = useTimesheets()
  
  // Call onContextReady when context is available
  React.useEffect(() => {
    if (onContextReady) {
      onContextReady(context)
    }
  }, [context, onContextReady])
  
  return (
    <div>
      <div data-testid="loading">{context.isLoading.toString()}</div>
      <div data-testid="timesheet-count">{context.timesheets.length}</div>
      {context.selectedTimesheet && (
        <div data-testid="selected-timesheet">{context.selectedTimesheet.id}</div>
      )}
      <div data-testid="time-entry-count">{context.timeEntries.length}</div>
    </div>
  )
}

describe('TimesheetContext', () => {
  const mockTimesheet: Timesheet = {
    id: 'ts-123',
    organization_id: 'org-123',
    employee_id: 'emp-123',
    period_start_date: '2025-02-01',
    period_end_date: '2025-02-15',
    status: 'draft',
    total_hours: 40,
    review_notes: undefined
  }

  const mockTimeEntry: TimeEntry = {
    id: 'te-123',
    organization_id: 'org-123',
    user_id: 'user-123',
    job_location_id: 'loc-123',
    clock_in: '2025-02-01T09:00:00Z',
    clock_out: '2025-02-01T17:00:00Z',
    break_start: null,
    break_end: null,
    total_break_minutes: 0,
    service_type: 'hvac',
    work_description: 'Test entry',
    status: 'completed'
  }

  const mockEmployee: Employee = {
    id: 'emp-123',
    organization_id: 'org-123',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    role: 'employee',
    status: 'active',
    start_date: '2025-01-01',
    pto: {
      vacation: {
        beginningBalance: 0,
        ongoingBalance: 0,
        firstYearRule: 0,
        used: 0
      },
      sickLeave: {
        beginningBalance: 0,
        used: 0
      }
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    
    // Mock auth context
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn()
    })

    // Mock organization context with userRole
    vi.mocked(useOrganization).mockReturnValue({
      organization: {
        id: 'org-123',
        name: 'Test Org',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        slug: 'test-org',
        settings: {},
        branding: {
          primary_color: '#000000',
          secondary_color: '#ffffff',
          logo_url: null,
          favicon_url: null,
          company_name: null,
          company_website: null
        }
      },
      userRole: 'admin',
      isLoading: false,
      error: null,
      createOrganization: vi.fn(),
      joinOrganization: vi.fn(),
      leaveOrganization: vi.fn(),
      sendInvite: vi.fn(),
      revokeInvite: vi.fn(),
      acceptInvite: vi.fn()
    })

    // Mock employees context
    vi.mocked(useEmployees).mockReturnValue({
      employees: [],
      isLoading: false,
      error: null,
      refreshEmployees: vi.fn(),
      createEmployee: vi.fn(),
      updateEmployee: vi.fn(),
      deleteEmployee: vi.fn(),
      importEmployees: vi.fn()
    })

    // Mock employee service
    vi.mocked(employeeService.getEmployeeByUserId).mockResolvedValue({
      success: true,
      data: mockEmployee
    })

    // Mock service functions
    vi.mocked(timesheetService.listTimesheetsForOrganization).mockResolvedValue({
      success: true,
      data: [mockTimesheet]
    })

    vi.mocked(timeEntryService.listTimeEntriesByTimesheet).mockResolvedValue({
      success: true,
      data: [mockTimeEntry]
    })
  })

  it('loads timesheets on mount', async () => {
    render(
      <TimesheetProvider>
        <TestComponent />
      </TimesheetProvider>
    )

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    // Wait for timesheets to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
      expect(screen.getByTestId('timesheet-count')).toHaveTextContent('1')
    })
  })

  it('selects timesheet and loads its time entries', async () => {
    let timesheetContext: ReturnType<typeof useTimesheets>
    
    render(
      <TimesheetProvider>
        <TestComponent onContextReady={(context) => {
          timesheetContext = context
        }} />
      </TimesheetProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Select timesheet using the context
    await act(async () => {
      await timesheetContext!.selectTimesheet(mockTimesheet)
    })

    // Verify selected timesheet and time entries are loaded
    await waitFor(() => {
      expect(screen.getByTestId('selected-timesheet')).toHaveTextContent('ts-123')
      expect(screen.getByTestId('time-entry-count')).toHaveTextContent('1')
    })
  })

  it('creates a new timesheet', async () => {
    let timesheetContext: ReturnType<typeof useTimesheets>
    
    vi.mocked(timesheetService.createTimesheet).mockResolvedValue({
      success: true,
      data: mockTimesheet
    })

    render(
      <TimesheetProvider>
        <TestComponent onContextReady={(context) => {
          timesheetContext = context
        }} />
      </TimesheetProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Create timesheet using the context
    await act(async () => {
      await timesheetContext!.createTimesheet(
        'emp-123',
        new Date('2025-02-01'),
        new Date('2025-02-15')
      )
    })

    // Verify timesheet is added to list
    await waitFor(() => {
      expect(screen.getByTestId('timesheet-count')).toHaveTextContent('2')
    })
  })

  it('updates timesheet status', async () => {
    let timesheetContext: ReturnType<typeof useTimesheets>
    
    const updatedTimesheet: Timesheet = {
      ...mockTimesheet,
      status: 'approved' as TimesheetStatus,
      review_notes: 'Approved with comments',
      total_hours: 40
    }

    vi.mocked(timesheetService.updateTimesheetStatus).mockResolvedValue({
      success: true,
      data: updatedTimesheet
    })

    render(
      <TimesheetProvider>
        <TestComponent onContextReady={(context) => {
          timesheetContext = context
        }} />
      </TimesheetProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Update timesheet using the context
    await act(async () => {
      await timesheetContext!.updateTimesheetStatus(
        'ts-123',
        'approved',
        'Approved with comments',
        40
      )
    })

    // Verify timesheet is updated
    expect(vi.mocked(timesheetService.updateTimesheetStatus)).toHaveBeenCalledWith(
      'ts-123',
      'approved',
      'Approved with comments',
      40
    )
  })

  it('creates a new time entry', async () => {
    let timesheetContext: ReturnType<typeof useTimesheets>
    
    vi.mocked(timeEntryService.createTimeEntry).mockResolvedValue({
      success: true,
      data: mockTimeEntry
    })

    render(
      <TimesheetProvider>
        <TestComponent onContextReady={(context) => {
          timesheetContext = context
        }} />
      </TimesheetProvider>
    )

    // Wait for initial load and select timesheet
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      await timesheetContext!.selectTimesheet(mockTimesheet)
      await timesheetContext!.createTimeEntry(
        'emp-123',
        'loc-123',
        'hvac',
        'Test entry'
      )
    })

    // Verify time entry is added
    await waitFor(() => {
      expect(screen.getByTestId('time-entry-count')).toHaveTextContent('2')
    })
  })
})
