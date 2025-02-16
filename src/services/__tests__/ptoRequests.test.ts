import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  createPTORequest,
  updatePTORequest,
  deletePTORequest,
  listPTORequests,
  getPTOBalance,
  PTORequest
} from '../ptoRequests';
import { getVacationBalance, getSickLeaveBalance } from '../../utils/ptoCalculations';
import { Database } from '../../types/database.types';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

// Mock PTO calculation utilities
vi.mock('../../utils/ptoCalculations', () => ({
  getVacationBalance: vi.fn(),
  getSickLeaveBalance: vi.fn()
}));

type MockSupabaseClient = SupabaseClient<Database>;

describe('PTO Request Service', () => {
  const mockPTORequest: PTORequest = {
    id: '123',
    organization_id: 'org123',
    user_id: 'user123',
    start_date: '2025-02-10',
    end_date: '2025-02-15',
    type: 'vacation',
    status: 'pending',
    notes: 'Test vacation',
    created_at: '2025-02-10T00:00:00Z'
  };

  const mockEmployee = {
    id: 'user123',
    start_date: '2024-01-01',
    pto: {
      vacation: {
        beginningBalance: 0,
        ongoingBalance: 0,
        used: 2
      },
      sickLeave: {
        beginningBalance: 0,
        used: 1
      }
    }
  };

  const mockTimesheet = {
    id: 'ts123',
    employee_id: 'user123',
    organization_id: 'org123',
    period_start_date: '2025-02-03',
    period_end_date: '2025-02-09',
    status: 'approved',
    total_hours: 40,
    review_notes: '',
    reviewed_by: 'manager123',
    reviewed_at: '2025-02-10T00:00:00Z',
    time_entries: [
      {
        id: 'te123',
        user_id: 'user123',
        job_location_id: 'loc123',
        entry_date: '2025-02-03',
        start_time: '09:00:00',
        end_time: '17:00:00',
        break_duration: 60,
        work_description: 'Regular work day',
        organization_id: 'org123'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPTORequest', () => {
    it('should create a new PTO request', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        data: mockPTORequest,
        error: null
      });

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          insert: mockInsert,
          select: () => ({
            single: () => ({ data: mockPTORequest, error: null })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await createPTORequest(
        'org123',
        'user123',
        '2025-02-10',
        '2025-02-15',
        'vacation',
        40,
        'Test vacation'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPTORequest);
    });

    it('should handle errors when creating PTO request', async () => {
      const mockError = new Error('Database error');
      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => ({ data: null, error: mockError })
            })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await createPTORequest(
        'org123',
        'user123',
        '2025-02-10',
        '2025-02-15',
        'vacation',
        40,
        'Test vacation'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updatePTORequest', () => {
    it('should update a PTO request', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        data: { ...mockPTORequest, status: 'approved' },
        error: null
      });

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          update: mockUpdate,
          select: () => ({
            single: () => ({ data: { ...mockPTORequest, status: 'approved' }, error: null })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await updatePTORequest('123', { status: 'approved' });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('approved');
    });
  });

  describe('deletePTORequest', () => {
    it('should delete a PTO request', async () => {
      const mockDelete = vi.fn().mockReturnValue({ error: null });

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          delete: mockDelete,
          eq: () => ({ error: null })
        })
      } as unknown as MockSupabaseClient);

      const result = await deletePTORequest('123');

      expect(result.success).toBe(true);
    });
  });

  describe('listPTORequests', () => {
    it('should list PTO requests with filters', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        data: [mockPTORequest],
        error: null
      });

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          select: mockSelect,
          eq: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({ data: [mockPTORequest], error: null })
              })
            })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await listPTORequests('org123', {
        userId: 'user123',
        status: 'pending',
        startDate: '2025-02-01',
        endDate: '2025-02-28'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual(mockPTORequest);
    });
  });

  describe('getPTOBalance', () => {
    it('should calculate PTO balance for vacation', async () => {
      (getVacationBalance as jest.Mock).mockReturnValue(80);

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          select: () => ({
            single: () => ({ data: mockEmployee, error: null }),
            eq: () => ({ data: [mockPTORequest], error: null })
          }),
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ data: [mockPTORequest], error: null })
              })
            })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await getPTOBalance('org123', 'user123', 'vacation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        available: 80,
        used: 1,
        pending: 1
      });
    });

    it('should calculate PTO balance for sick leave', async () => {
      (getSickLeaveBalance as jest.Mock).mockReturnValue(40);

      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          select: () => ({
            single: () => ({ data: mockEmployee, error: null }),
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ data: [mockTimesheet], error: null })
                })
              })
            })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await getPTOBalance('org123', 'user123', 'sick');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        available: 40,
        used: 1,
        pending: 1
      });
    });

    it('should handle errors when employee not found', async () => {
      (createClient as jest.Mock<MockSupabaseClient>).mockReturnValue({
        from: () => ({
          select: () => ({
            single: () => ({ data: null, error: new Error('Employee not found') })
          })
        })
      } as unknown as MockSupabaseClient);

      const result = await getPTOBalance('org123', 'user123', 'vacation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Employee not found');
    });
  });
});
