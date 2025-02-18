import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInvite, listOrgInvites, revokeInvite } from '../invites';
import { supabase } from '../../lib/supabase';
import { getEmailService } from '../email';
import { InviteError, InviteErrorCode } from '../../utils/errorHandling';
import { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

// Create reusable mock chain methods
const mockFrom = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder
  }
}));

// Mock Email Service
vi.mock('../email', () => ({
  getEmailService: vi.fn().mockReturnValue({
    sendInvite: vi.fn().mockResolvedValue(undefined)
  })
}));

const createSuccessResponse = <T>(data: T): PostgrestSingleResponse<T> => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK'
});

const createErrorResponse = <T>(error: PostgrestError): PostgrestSingleResponse<T> => ({
  data: null,
  error,
  count: null,
  status: 400,
  statusText: 'Bad Request'
});

const mockError = (message: string): PostgrestError => ({
  name: 'PostgrestError',
  message,
  details: '',
  hint: '',
  code: 'ERROR'
});

describe('Invite Service', () => {
  const mockOrg = {
    id: 'test-org-id',
    name: 'Test Org'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mock implementations
    mockFrom.mockReturnThis();
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
    mockSingle.mockReturnThis();
    mockOrder.mockReturnThis();
  });

  describe('createInvite', () => {
    const mockEmail = 'test@example.com';
    const mockRole = 'employee';

    beforeEach(() => {
      // Mock successful organization lookup
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: () => ({
              eq: () => ({
                single: () => createSuccessResponse(mockOrg)
              })
            })
          };
        }
        return mockFrom();
      });

      // Mock no existing invite check
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => createErrorResponse(mockError('No rows returned'))
                  })
                })
              })
            })
          };
        }
        return mockFrom();
      });

      // Mock successful invite creation
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            insert: () => ({
              select: () => ({
                single: () => createSuccessResponse({ id: 'test-invite-id' })
              })
            })
          };
        }
        return mockFrom();
      });
    });

    it('should create invite successfully', async () => {
      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(true);
      expect(result.inviteId).toBeDefined();
    });

    it('should handle duplicate invites', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => createSuccessResponse({ id: 'existing-invite' })
                  })
                })
              })
            })
          };
        }
        return mockFrom();
      });

      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been sent');
    });

    it('should handle email service errors', async () => {
      vi.mocked(getEmailService().sendInvite).mockRejectedValueOnce(
        new Error('Email failed')
      );

      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send invite email');
    });

    it('should validate email format', async () => {
      const result = await createInvite('invalid-email', mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });
  });

  describe('listOrgInvites', () => {
    const mockInvites = [
      { id: 'invite-1', email: 'test1@example.com' },
      { id: 'invite-2', email: 'test2@example.com' }
    ];

    it('should list invites successfully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            select: () => ({
              eq: () => ({
                order: () => createSuccessResponse(mockInvites)
              })
            })
          };
        }
        return mockFrom();
      });

      const result = await listOrgInvites(mockOrg.id);
      expect(result).toEqual(mockInvites);
    });

    it('should handle database errors', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            select: () => ({
              eq: () => ({
                order: () => createErrorResponse<any[]>(mockError('Database error occurred'))
              })
            })
          };
        }
        return mockFrom();
      });

      await expect(listOrgInvites(mockOrg.id)).rejects.toThrow();
    });
  });

  describe('revokeInvite', () => {
    const mockInviteId = 'test-invite-id';

    it('should revoke invite successfully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            update: () => ({
              eq: () => createSuccessResponse(null)
            })
          };
        }
        return mockFrom();
      });

      const result = await revokeInvite(mockInviteId);
      expect(result).toBe(true);
    });

    it('should handle revocation errors', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organization_invites') {
          return {
            update: () => ({
              eq: () => createErrorResponse(mockError('Database error occurred'))
            })
          };
        }
        return mockFrom();
      });

      const result = await revokeInvite(mockInviteId);
      expect(result).toBe(false);
    });
  });
});
