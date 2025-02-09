import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimesheet,
  getTimesheetById,
  listTimesheetsForEmployee,
  listTimesheetsForOrganization,
  updateTimesheetStatus
} from '../timesheets'
import { supabase } from '../../lib/supabase'
import { Timesheet } from '../../types/custom.types'

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('../../lib/supabase')

// Define types for our mock query builder
type SupabaseResponse<T> = { data: T | null; error: Error | null }
type QueryCallback<T> = (value: SupabaseResponse<T[]>) => void

interface MockQueryBuilder {
  // Required PostgrestQueryBuilder properties
  url: string;
  headers: Record<string, string>;
  // Mock methods
  insert?: (value: Partial<Timesheet>) => MockQueryBuilder;
  select?: () => MockQueryBuilder;
  eq?: (column: string, value: string) => MockQueryBuilder;
  gte?: (column: string, value: string) => MockQueryBuilder;
  lte?: (column: string, value: string) => MockQueryBuilder;
  order?: (column: string, options: { ascending: boolean }) => MockQueryBuilder;
  update?: (value: Partial<Timesheet>) => MockQueryBuilder;
  in?: (column: string, values: string[]) => MockQueryBuilder;
  single?: () => Promise<SupabaseResponse<Timesheet>>;
  then?: (callback: QueryCallback<Timesheet>) => void;
  // Required PostgrestQueryBuilder methods
  upsert: () => MockQueryBuilder;
  delete: () => MockQueryBuilder;
}

describe('timesheet service', () => {
  const mockTimesheet: Timesheet = {
    id: 'ts-123',
    organization_id: 'org-123',
    employee_id: 'emp-123',
    period_start_date: '2025-02-01',
    period_end_date: '2025-02-15',
    status: 'draft',
    total_hours: 0,
    submitted_at: undefined,
    reviewed_by: undefined,
    reviewed_at: undefined,
    review_notes: undefined
  }

  const createMockBuilder = (): MockQueryBuilder => ({
    url: 'mock-url',
    headers: {},
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createTimesheet', () => {
    it('creates a new timesheet successfully', async () => {
      const mockQueryBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimesheet,
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const result = await createTimesheet(
        'emp-123',
        'org-123',
        new Date('2025-02-01'),
        new Date('2025-02-15')
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimesheet)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        employee_id: 'emp-123',
        organization_id: 'org-123',
        period_start_date: '2025-02-01',
        period_end_date: '2025-02-15',
        status: 'draft',
        total_hours: 0
      })
    })

    it('handles creation failure', async () => {
      const mockError = new Error('Database error')
      const mockQueryBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(mockError)
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const result = await createTimesheet(
        'emp-123',
        'org-123',
        new Date('2025-02-01'),
        new Date('2025-02-15')
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getTimesheetById', () => {
    it('gets a timesheet with time entries', async () => {
      const mockQueryBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTimesheet, time_entries: [] },
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const result = await getTimesheetById('ts-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ ...mockTimesheet, time_entries: [] })
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'ts-123')
    })
  })

  describe('listTimesheetsForEmployee', () => {
    it('lists timesheets for employee with filters', async () => {
      const mockTimesheets = [mockTimesheet]
      const mockQueryBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockTimesheets,
          error: null
        }))
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const result = await listTimesheetsForEmployee(
        'emp-123',
        'draft',
        new Date('2025-02-01'),
        new Date('2025-02-15')
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimesheets)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('employee_id', 'emp-123')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'draft')
    })
  })

  describe('listTimesheetsForOrganization', () => {
    it('lists timesheets for organization with employee details', async () => {
      const mockEmployees = [{
        id: 'emp-123',
        first_name: 'John',
        last_name: 'Doe',
        department: 'HVAC'
      }]

      const mockTimesheetBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: [mockTimesheet],
          error: null
        }))
      }

      const mockEmployeeBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockEmployees,
          error: null
        }))
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTimesheetBuilder as any)
        .mockReturnValueOnce(mockEmployeeBuilder as any)

      const result = await listTimesheetsForOrganization('org-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([{
        ...mockTimesheet,
        employee: mockEmployees[0]
      }])
      expect(mockTimesheetBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })
  })

  describe('updateTimesheetStatus', () => {
    it('updates timesheet status with review notes', async () => {
      const updatedTimesheet = {
        ...mockTimesheet,
        status: 'approved',
        reviewed_at: '2025-02-05T18:00:00Z',
        review_notes: 'Approved with comments',
        updated_at: expect.any(String),
        total_hours: 0,
        time_entries: []
      }

      const mockTimesheetBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimesheet,
          error: null
        })
      }

      const mockEmployeeBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-123', member_id: 'mem-123' },
          error: null
        })
      }

      const mockMemberBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-123' },
          error: null
        })
      }

      const mockTimeEntriesBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: [],
          error: null
        }))
      }

      const mockUpdateBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: null,
          error: null
        }))
      }

      const mockVerifyBuilder: MockQueryBuilder = {
        ...createMockBuilder(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...updatedTimesheet, time_entries: [] },
          error: null
        })
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTimesheetBuilder as any) // Get existing timesheet
        .mockReturnValueOnce(mockEmployeeBuilder as any) // Get employee
        .mockReturnValueOnce(mockMemberBuilder as any) // Get member
        .mockReturnValueOnce(mockTimeEntriesBuilder as any) // Get time entries
        .mockReturnValueOnce(mockUpdateBuilder as any) // Update timesheet
        .mockReturnValueOnce(mockVerifyBuilder as any) // Get updated timesheet
        .mockReturnValueOnce(mockTimeEntriesBuilder as any) // Get final time entries

      const result = await updateTimesheetStatus(
        'ts-123',
        'approved',
        'Approved with comments'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedTimesheet)
      expect(mockUpdateBuilder.update).toHaveBeenCalledWith({
        status: 'approved',
        updated_at: expect.any(String),
        total_hours: 0,
        review_notes: 'Approved with comments',
        reviewed_at: expect.any(String)
      })
    })
  })
})
