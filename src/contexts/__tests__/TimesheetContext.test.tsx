import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { TimesheetProvider, useTimesheets } from '../TimesheetContext'
import * as timesheetService from '../../services/timesheets'
import * as timeEntryService from '../../services/timeEntries'
import { useOrganization } from '../OrganizationContext'
import { useEmployees } from '../EmployeeContext'
import React from 'react'

// Mock the service modules
vi.mock('../../services/timesheets')
vi.mock('../../services/timeEntries')
vi.mock('../OrganizationContext')
vi.mock('../EmployeeContext')

// Test component to access context
function TestComponent({ onContextReady }: { onContextReady?: (context: any) => void } = {}) {
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
  const mockTimesheet = {
    id: 'ts-123',
    organization_id: 'org-123',
    employee_id: 'emp-123',
    period_start: new Date('2025-02-01'),
    period_end: new Date('2025-02-15'),
    status: 'draft'
  }

  const mockTimeEntry = {
    id: 'te-123',
    timesheet_id: 'ts-123',
    employee_id: 'emp-123',
    job_location_id: 'loc-123',
    entry_date: new Date('2025-02-01'),
    start_time: new Date('2025-02-01T09:00:00Z'),
    end_time: new Date('2025-02-01T17:00:00Z'),
    break_duration: 30,
    notes: 'Test entry'
  }

  beforeEach(() => {
    vi.resetAllMocks()
    
    // Mock organization context
    vi.mocked(useOrganization).mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      isLoading: false,
      error: null,
      setOrganization: vi.fn()
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
    let timesheetContext: any
    
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
      await timesheetContext.selectTimesheet(mockTimesheet)
    })

    // Verify selected timesheet and time entries are loaded
    await waitFor(() => {
      expect(screen.getByTestId('selected-timesheet')).toHaveTextContent('ts-123')
      expect(screen.getByTestId('time-entry-count')).toHaveTextContent('1')
    })
  })

  it('creates a new timesheet', async () => {
    let timesheetContext: any
    
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
      await timesheetContext.createTimesheet(
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
    let timesheetContext: any
    
    const updatedTimesheet = {
      ...mockTimesheet,
      status: 'approved',
      review_notes: 'Approved with comments'
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
      await timesheetContext.updateTimesheetStatus(
        'ts-123',
        'approved',
        'Approved with comments'
      )
    })

    // Verify timesheet is updated
    expect(vi.mocked(timesheetService.updateTimesheetStatus)).toHaveBeenCalledWith(
      'ts-123',
      'approved',
      'Approved with comments'
    )
  })

  it('creates a new time entry', async () => {
    let timesheetContext: any
    
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
      await timesheetContext.selectTimesheet(mockTimesheet)
      await timesheetContext.createTimeEntry(
        'emp-123',
        'loc-123',
        new Date('2025-02-01'),
        new Date('2025-02-01T09:00:00Z'),
        new Date('2025-02-01T17:00:00Z'),
        30,
        'Test entry'
      )
    })

    // Verify time entry is added
    await waitFor(() => {
      expect(screen.getByTestId('time-entry-count')).toHaveTextContent('2')
    })
  })
})
