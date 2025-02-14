import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPTORequest, updatePTORequestStatus, deletePTORequest, listPTORequests } from '../pto';
import { supabase } from '../../lib/supabase';

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
      const mockResponse = {
        data: {
          id: 'pto-123',
          user_id: mockUserId,
          status: 'pending',
          created_at: new Date().toISOString()
        },
        error: null
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await createPTORequest(mockUserId, mockOrgId, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Database error');
      });

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
      const mockResponse = {
        data: [{
          id: 'pto-123',
          user_id: mockUserId,
          status: 'pending',
          type: 'vacation'
        }],
        error: null
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse)
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await listPTORequests(mockOrgId, {
        userId: mockUserId,
        status: 'pending'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle errors', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await listPTORequests(mockOrgId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
