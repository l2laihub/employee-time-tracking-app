import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimeEntry,
  updateTimeEntry,
  clockOut,
  listTimeEntries,
  getTimesheet,
  getActiveTimeEntry,
  startBreak,
  endBreak,
  TimeEntry
} from '../timeEntries'
import { supabase } from '../../lib/supabase'
import { addHours } from 'date-fns'

vi.mock('../../lib/supabase')

describe('time entries service', () => {
  const mockTimeEntry: TimeEntry = {
    id: 'entry-123',
    user_id: 'user-123',
    job_location_id: 'loc-123',
    start_time: '2025-01-28T08:00:00Z',
    end_time: '2025-01-28T16:00:00Z',
    notes: 'HVAC maintenance',
    break_duration: 0,
    status: 'completed',
    organization_id: 'org-123',
    created_at: '2025-01-28T08:00:00Z',
    updated_at: '2025-01-28T16:00:00Z'
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createTimeEntry', () => {
    it('creates a new time entry successfully', async () => {
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await createTimeEntry(
        'user-123',
        'loc-123',
        '2025-01-28T08:00:00Z',
        'hvac',
        'HVAC maintenance',
        'org-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimeEntry)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        job_location_id: 'loc-123',
        start_time: '2025-01-28T08:00:00Z',
        notes: 'HVAC maintenance',
        status: 'working',
        organization_id: 'org-123',
        break_duration: 0
      })
    })

    it('handles creation failure', async () => {
      const mockError = new Error('Database error')
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(mockError)
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await createTimeEntry(
        'user-123',
        'loc-123',
        '2025-01-28T08:00:00Z',
        'hvac',
        'HVAC maintenance',
        'org-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('updateTimeEntry', () => {
    it('updates a time entry successfully', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const updates = {
        notes: 'Updated description'
      }

      const result = await updateTimeEntry('entry-123', updates)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimeEntry)
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updates)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'entry-123')
    })
  })

  describe('clockOut', () => {
    it('clocks out successfully', async () => {
      const clockOutTime = '2025-01-28T16:00:00Z'
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTimeEntry, end_time: clockOutTime, status: 'completed' },
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await clockOut('entry-123', clockOutTime)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        ...mockTimeEntry,
        end_time: clockOutTime,
        status: 'completed'
      })
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        end_time: clockOutTime,
        status: 'completed'
      })
    })
  })

  describe('listTimeEntries', () => {
    it('lists time entries for organization', async () => {
      const mockEntries = [mockTimeEntry]
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockEntries,
          error: null
        }))
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await listTimeEntries('org-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEntries)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })

    it('lists time entries for specific user', async () => {
      const mockEntries = [mockTimeEntry]
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => callback({
          data: mockEntries,
          error: null
        }))
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await listTimeEntries('org-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEntries)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })

  describe('getTimesheet', () => {
    it('gets timesheet with calculated hours', async () => {
      const mockEntries = [
        {
          ...mockTimeEntry,
          start_time: '2025-01-28T08:00:00Z',
          end_time: '2025-01-28T16:00:00Z',
          break_duration: 30,
          status: 'completed'
        }
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockEntries,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await getTimesheet('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.entries).toEqual(mockEntries)
      // 8 hours - 30 minutes break = 7.5 hours
      expect(result.data?.totalHours).toBe(7.5)
    })
  })

  describe('getActiveTimeEntry', () => {
    it('returns active time entry if exists', async () => {
      const activeEntry = {
        ...mockTimeEntry,
        status: 'working',
        end_time: null
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: activeEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await getActiveTimeEntry('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(activeEntry)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'working')
    })

    it('returns null data if no active entry', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await getActiveTimeEntry('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })
  })

  describe('startBreak', () => {
    it('starts break successfully', async () => {
      const mockEntry = {
        ...mockTimeEntry,
        status: 'working',
        break_duration: 0
      }

      const mockUpdatedEntry = {
        ...mockEntry,
        status: 'break'
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockEntry, error: null })
          .mockResolvedValueOnce({ data: mockUpdatedEntry, error: null }),
        update: vi.fn().mockReturnThis()
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await startBreak('entry-123')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('break')
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'break'
      })
    })

    it('fails to start break when already on break', async () => {
      const mockEntry = {
        ...mockTimeEntry,
        status: 'break'
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await startBreak('entry-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Time entry must be working to start break')
    })
  })

  describe('endBreak', () => {
    it('ends break successfully', async () => {
      const mockEntry = {
        ...mockTimeEntry,
        status: 'break',
        break_duration: 30
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockEntry,
          error: null
        }).mockResolvedValueOnce({
          data: { ...mockEntry, status: 'working', break_duration: 60 },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await endBreak('entry-123')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('working')
      expect(result.data?.break_duration).toBe(60)
    })

    it('fails to end break when not on break', async () => {
      const mockEntry = {
        ...mockTimeEntry,
        status: 'working',
        break_duration: 0
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await endBreak('entry-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Time entry must be in break status')
    })
  })
})
