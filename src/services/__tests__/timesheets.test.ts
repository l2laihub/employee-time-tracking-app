import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimesheet,
  getTimesheetById,
  listTimesheetsForEmployee,
  listTimesheetsForOrganization,
  updateTimesheetStatus,
  TimesheetResult
} from '../timesheets'
import { supabase } from '../../lib/supabase'
import { Timesheet } from '../../types/custom.types'

vi.mock('../../lib/supabase')

describe('timesheet service', () => {
  const mockTimesheet: Timesheet = {
    id: 'ts-123',
    organization_id: 'org-123',
    employee_id: 'emp-123',
    period_start: new Date('2025-02-01'),
    period_end: new Date('2025-02-15'),
    status: 'draft',
    total_hours: 0,
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createTimesheet', () => {
    it('creates a new timesheet successfully', async () => {
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimesheet,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

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
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(mockError)
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

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
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTimesheet, time_entries: [] },
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await getTimesheetById('ts-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ ...mockTimesheet, time_entries: [] })
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'ts-123')
    })
  })

  describe('listTimesheetsForEmployee', () => {
    it('lists timesheets for employee with filters', async () => {
      const mockTimesheets = [mockTimesheet]
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockTimesheets,
          error: null
        }))
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

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
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('period_start_date', '2025-02-01')
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('period_end_date', '2025-02-15')
    })
  })

  describe('listTimesheetsForOrganization', () => {
    it('lists timesheets for organization with employee details', async () => {
      const mockTimesheets = [{
        ...mockTimesheet,
        employees: {
          first_name: 'John',
          last_name: 'Doe',
          department: 'HVAC'
        }
      }]
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockTimesheets,
          error: null
        }))
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await listTimesheetsForOrganization('org-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimesheets)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })
  })

  describe('updateTimesheetStatus', () => {
    it('updates timesheet status with review notes', async () => {
      const updatedTimesheet = {
        ...mockTimesheet,
        status: 'approved',
        reviewed_at: '2025-02-05T18:00:00Z',
        review_notes: 'Approved with comments'
      }
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedTimesheet,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await updateTimesheetStatus(
        'ts-123',
        'approved',
        'Approved with comments'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedTimesheet)
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'approved',
        reviewed_at: expect.any(String),
        review_notes: 'Approved with comments'
      })
    })
  })
})
