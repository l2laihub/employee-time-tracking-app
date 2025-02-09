import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  listTimeEntriesByTimesheet,
  listTimeEntriesByDateRange,
  getTimeEntryById,
  TimeEntryResult
} from '../timeEntries'
import { supabase } from '../../lib/supabase'
import { TimeEntry } from '../../types/custom.types'

// Mock the Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('time entries service', () => {
  const mockTimeEntry: TimeEntry = {
    id: 'entry-123',
    employee_id: 'emp-123',
    organization_id: 'org-123',
    job_location_id: 'loc-123',
    entry_date: new Date('2025-02-01'),
    start_time: new Date('2025-02-01T09:00:00Z'),
    end_time: new Date('2025-02-01T17:00:00Z'),
    break_duration: 30,
    notes: 'Test entry'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTimeEntry', () => {
    it('creates a new time entry successfully', async () => {
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await createTimeEntry(
        'emp-123',
        'org-123',
        'loc-123',
        new Date('2025-02-01'),
        new Date('2025-02-01T09:00:00Z'),
        new Date('2025-02-01T17:00:00Z'),
        30,
        'Test entry'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTimeEntry)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        employee_id: 'emp-123',
        organization_id: 'org-123',
        job_location_id: 'loc-123',
        entry_date: '2025-02-01',
        start_time: '2025-02-01T09:00:00.000Z',
        end_time: '2025-02-01T17:00:00.000Z',
        break_duration: 30,
        notes: 'Test entry'
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

      const result = await createTimeEntry(
        'emp-123',
        'org-123',
        'loc-123',
        new Date('2025-02-01'),
        new Date('2025-02-01T09:00:00Z'),
        new Date('2025-02-01T17:00:00Z')
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

  describe('deleteTimeEntry', () => {
    it('deletes a time entry successfully', async () => {
      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          error: null
        })
      }

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any)

      const result = await deleteTimeEntry('entry-123')

      expect(result.success).toBe(true)
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'entry-123')
    })
  })

  describe('listTimeEntriesByTimesheet', () => {
    it('lists time entries for a timesheet', async () => {
      // Mock timesheet query
      const mockTimesheetBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            period_start_date: '2025-02-01',
            period_end_date: '2025-02-15'
          },
          error: null
        })
      };

      // Mock time entries query
      const mockEntriesBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      };

      // Add promise resolution to the last order call
      const mockEntriesPromise = Promise.resolve({
        data: [mockTimeEntry],
        error: null
      });
      mockEntriesBuilder.order.mockReturnValueOnce(mockEntriesBuilder);
      mockEntriesBuilder.order.mockReturnValueOnce({
        then: mockEntriesPromise.then.bind(mockEntriesPromise)
      });

      // Mock supabase.from to return appropriate builder
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'timesheets') {
          return mockTimesheetBuilder;
        }
        return mockEntriesBuilder;
      });

      const result = await listTimeEntriesByTimesheet('ts-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTimeEntry]);

      // Verify timesheet query
      expect(mockTimesheetBuilder.select).toHaveBeenCalledWith('period_start_date, period_end_date');
      expect(mockTimesheetBuilder.eq).toHaveBeenCalledWith('id', 'ts-123');

      // Verify time entries query
      expect(mockEntriesBuilder.select).toHaveBeenCalledWith(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `);
      expect(mockEntriesBuilder.gte).toHaveBeenCalledWith('entry_date', '2025-02-01');
      expect(mockEntriesBuilder.lte).toHaveBeenCalledWith('entry_date', '2025-02-15');
      expect(mockEntriesBuilder.order).toHaveBeenCalledTimes(2);
      expect(mockEntriesBuilder.order).toHaveBeenNthCalledWith(1, 'entry_date', { ascending: true });
      expect(mockEntriesBuilder.order).toHaveBeenNthCalledWith(2, 'start_time', { ascending: true });
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('listTimeEntriesByDateRange', () => {
    it('lists time entries for a date range', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      };

      // Add promise resolution to the last order call
      const mockPromise = Promise.resolve({
        data: [mockTimeEntry],
        error: null
      });
      mockBuilder.order.mockReturnValueOnce(mockBuilder);
      mockBuilder.order.mockReturnValueOnce({
        then: mockPromise.then.bind(mockPromise)
      });

      vi.mocked(supabase.from).mockReturnValue(mockBuilder);

      const result = await listTimeEntriesByDateRange(
        'emp-123',
        new Date('2025-02-01'),
        new Date('2025-02-15')
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTimeEntry]);

      // Verify query chain
      expect(mockBuilder.select).toHaveBeenCalledWith(`
        *,
        job_locations (
          name,
          type,
          service_type
        )
      `);
      expect(mockBuilder.eq).toHaveBeenCalledWith('employee_id', 'emp-123');
      expect(mockBuilder.gte).toHaveBeenCalledWith('entry_date', '2025-02-01');
      expect(mockBuilder.lte).toHaveBeenCalledWith('entry_date', '2025-02-15');
      expect(mockBuilder.order).toHaveBeenCalledTimes(2);
      expect(mockBuilder.order).toHaveBeenNthCalledWith(1, 'entry_date', { ascending: true });
      expect(mockBuilder.order).toHaveBeenNthCalledWith(2, 'start_time', { ascending: true });
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('getTimeEntryById', () => {
    it('gets a time entry by id', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      };

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder);

      const result = await getTimeEntryById('entry-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'entry-123');
    });
  });
});
