import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPTORequest, updatePTORequestStatus, deletePTORequest, listPTORequests } from '../pto';
import { supabase } from '../../lib/supabase';
import { PTORequest } from '../../lib/types';

describe('PTO Service', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockRequest = {
    userId: mockUserId,
    startDate: '2025-02-15',
    endDate: '2025-02-16',
    type: 'vacation' as const,
    hours: 16,
    reason: 'Personal days',
    notes: 'Taking a short break'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPTORequest', () => {
    it('should create a PTO request successfully', async () => {
      // Mock auth
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'auth-123', email: 'test@example.com' } },
        error: null
      } as any);

      // Mock RPC response
      const mockRpcResponse = {
        data: {
          success: true,
          data: {
            id: 'pto-123',
            user_id: mockUserId,
            start_date: mockRequest.startDate,
            end_date: mockRequest.endDate,
            type: mockRequest.type,
            hours: mockRequest.hours,
            reason: mockRequest.reason,
            status: 'pending',
            created_at: new Date().toISOString(),
            created_by: 'auth-123',
            reviewed_by: null,
            reviewed_at: null
          }
        },
        error: null
      };

      vi.spyOn(supabase, 'rpc').mockResolvedValue(mockRpcResponse as any);

      const result = await createPTORequest(mockUserId, mockOrgId, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toMatchObject({
        id: 'pto-123',
        userId: mockUserId,
        status: 'pending'
      });
    });

    it('should handle errors', async () => {
      // Mock auth success but RPC failure
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'auth-123', email: 'test@example.com' } },
        error: null
      } as any);

      // Mock RPC failure
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      } as any);

      const result = await createPTORequest(mockUserId, mockOrgId, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updatePTORequestStatus', () => {
    it('should update status successfully', async () => {
      const mockResponse = {
        data: {
          id: 'pto-123',
          status: 'approved',
          reviewed_by: 'reviewer-123'
        },
        error: null
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await updatePTORequestStatus('pto-123', 'approved', 'reviewer-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await updatePTORequestStatus('pto-123', 'approved', 'reviewer-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('deletePTORequest', () => {
    it('should delete successfully', async () => {
      const mockResponse = { error: null };

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse)
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await deletePTORequest('pto-123');

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await deletePTORequest('pto-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('listPTORequests', () => {
    it('should list requests with filters', async () => {
      // Mock successful responses
      const mockResponse = {
        data: [{
          id: 'pto-123',
          user_id: mockUserId,
          organization_id: mockOrgId,
          start_date: '2025-02-15',
          end_date: '2025-02-16',
          type: 'vacation',
          hours: 16,
          reason: 'Personal days',
          status: 'pending',
          created_at: new Date().toISOString(),
          created_by: 'auth-123',
          reviewed_by: null,
          reviewed_at: null,
          employee: {
            id: 'emp-123',
            first_name: 'John',
            last_name: 'Doe',
            member_id: 'member-123',
            role: 'employee',
            email: 'john@example.com',
            organization_id: mockOrgId
          }
        }],
        error: null
      };

      // Mock auth
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'auth-123', email: 'test@example.com' } },
        error: null
      } as any);

      // Mock database queries with proper chaining
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      };

      // Add the final resolution to the last chained method
      mockQuery.eq.mockImplementation(() => {
        return {
          ...mockQuery,
          then: (callback: any) => callback(mockResponse)
        };
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'member-123', role: 'admin' },
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockQuery;
      });

      const result = await listPTORequests(mockOrgId, {
        userId: mockUserId,
        status: 'pending'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      const requests = result.data as PTORequest[];
      expect(requests[0]).toMatchObject({
        id: 'pto-123',
        userId: mockUserId,
        status: 'pending',
        employee: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });
    });

    it('should handle errors', async () => {
      // Mock auth success
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'auth-123', email: 'test@example.com' } },
        error: null
      } as any);

      // Mock database queries
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        // For organization members check
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'member-123', role: 'admin' },
                    error: null
                  })
                })
              })
            })
          };
        }
        
        // For PTO requests
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockRejectedValue(new Error('Database error'))
        } as any;

        return mockQuery;
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await listPTORequests(mockOrgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
