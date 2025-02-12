import { describe, it, expect, vi } from 'vitest'
import { createTimeEntry, listTimeEntriesByTimesheet } from '../timeEntries'
import { supabase } from '../../lib/supabase'
import { TimeEntry } from '../../types/custom.types'

// Helper function to create chainable mock methods
function createMockBuilder() {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return mock;
}

// Mock the Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('time entries service', () => {
  const mockTimeEntry: TimeEntry = {
    id: 'entry-123',
    user_id: 'emp-123',
    organization_id: 'org-123',
    job_location_id: 'loc-123',
    clock_in: new Date('2025-02-01T09:00:00Z').toISOString(),
    clock_out: null,
    break_start: null,
    break_end: null,
    total_break_minutes: 0,
    service_type: 'hvac',
    work_description: 'Test entry',
    status: 'active'
  }

  describe('createTimeEntry', () => {
    it('creates a new time entry successfully', async () => {
      // Mock hasActiveTimeEntry check
      const mockActiveCheck = createMockBuilder();
      mockActiveCheck.limit.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock create time entry
      const mockCreateEntry = createMockBuilder();
      mockCreateEntry.single.mockResolvedValue({
        data: mockTimeEntry,
        error: null
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (table === 'time_entries' ? mockCreateEntry : mockActiveCheck) as any
      )

      const result = await createTimeEntry(
        'emp-123',
        'loc-123',
        'hvac',
        'Test entry',
        'org-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimeEntry)
      expect(mockCreateEntry.insert).toHaveBeenCalledWith({
        user_id: 'emp-123',
        job_location_id: 'loc-123',
        service_type: 'hvac',
        work_description: 'Test entry',
        organization_id: 'org-123',
        clock_in: expect.any(String),
        status: 'active',
        total_break_minutes: 0
      })
    })

    it('handles creation failure', async () => {
      // Mock hasActiveTimeEntry check
      const mockActiveCheck = createMockBuilder();
      mockActiveCheck.limit.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock create time entry with error
      const mockCreateEntry = createMockBuilder();
      mockCreateEntry.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (table === 'time_entries' ? mockCreateEntry : mockActiveCheck) as any
      )

      const result = await createTimeEntry(
        'emp-123',
        'loc-123',
        'hvac',
        'Test entry',
        'org-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('listTimeEntriesByTimesheet', () => {
    it('lists time entries for a timesheet', async () => {
      const mockTimesheetBuilder = createMockBuilder();
      mockTimesheetBuilder.single.mockResolvedValue({
        data: {
          period_start_date: '2025-02-01',
          period_end_date: '2025-02-15',
          employee_id: 'emp-123'
        },
        error: null
      });

      const mockEntriesBuilder = createMockBuilder();
      mockEntriesBuilder.order.mockResolvedValue({
        data: [mockTimeEntry],
        error: null
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (table === 'timesheets' ? mockTimesheetBuilder : mockEntriesBuilder) as any
      )

      const result = await listTimeEntriesByTimesheet('ts-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([mockTimeEntry])
    })
  })
})
