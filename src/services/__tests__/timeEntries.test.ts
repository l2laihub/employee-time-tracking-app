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

// Helper function to create a mock PostgrestQueryBuilder
function createMockQueryBuilder(overrides = {}) {
  return {
    url: '',
    headers: {},
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    ...overrides
  };
}

describe('time entries service', () => {
  const mockTimeEntry: TimeEntry = {
    id: 'entry-123',
    user_id: 'emp-123',
    organization_id: 'org-123',
    job_location_id: 'loc-123',
    clock_in: '2025-02-01T09:00:00Z',
    clock_out: '2025-02-01T17:00:00Z',
    break_start: null,
    break_end: null,
    total_break_minutes: 30,
    service_type: 'hvac',
    work_description: 'Test entry',
    status: 'completed'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTimeEntry', () => {
    it('creates a new time entry successfully', async () => {
      const mockQueryBuilder = createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);

      const result = await createTimeEntry({
        user_id: 'emp-123',
        organization_id: 'org-123',
        job_location_id: 'loc-123',
        service_type: 'hvac',
        work_description: 'Test entry'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'emp-123',
        organization_id: 'org-123',
        job_location_id: 'loc-123',
        service_type: 'hvac',
        work_description: 'Test entry',
        status: 'active',
        total_break_minutes: 0
      }));
    })

    it('handles creation failure', async () => {
      const mockError = new Error('Database error');
      const mockQueryBuilder = createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);

      const result = await createTimeEntry({
        user_id: 'emp-123',
        organization_id: 'org-123',
        job_location_id: 'loc-123',
        service_type: 'hvac',
        work_description: 'Test entry'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError.message);
    });
  })

  describe('updateTimeEntry', () => {
    it('updates a time entry successfully', async () => {
      const mockQueryBuilder = createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);

      const updates = {
        work_description: 'Updated description'
      };

      const result = await updateTimeEntry('entry-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'entry-123');
    });
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
      const mockTimesheetBuilder = createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: {
            period_start_date: '2025-02-01',
            period_end_date: '2025-02-15',
            employee_id: 'emp-123'
          },
          error: null
        })
      });

      // Mock time entries query
      const mockEntriesBuilder = createMockQueryBuilder({
        order: vi.fn().mockImplementation((field, opts) => {
          if (field === 'entry_date') {
            return mockEntriesBuilder;
          }
          return {
            then: (callback: any) => callback({
              data: [mockTimeEntry],
              error: null
            })
          };
        })
      });

      // Mock supabase.from to return appropriate builder
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'timesheets') {
          return mockTimesheetBuilder as any;
        }
        return mockEntriesBuilder as any;
      });

      const result = await listTimeEntriesByTimesheet('ts-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTimeEntry]);

      // Verify timesheet query
      expect(mockTimesheetBuilder.select).toHaveBeenCalledWith('period_start_date, period_end_date, employee_id');
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
      const mockBuilder = createMockQueryBuilder({
        order: vi.fn().mockImplementation((field, opts) => {
          if (field === 'entry_date') {
            return mockBuilder;
          }
          return {
            then: (callback: any) => callback({
              data: [mockTimeEntry],
              error: null
            })
          };
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

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
      const mockQueryBuilder = createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: mockTimeEntry,
          error: null
        })
      });

      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);

      const result = await getTimeEntryById('entry-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'entry-123');
    });
  });
});
