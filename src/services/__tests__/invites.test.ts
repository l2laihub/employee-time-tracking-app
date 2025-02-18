import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInvite, listOrgInvites, revokeInvite } from '../invites';
import { supabase } from '../../lib/supabase';
import { getEmailService } from '../email';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { InviteError, InviteErrorCode } from '../../utils/errorHandling';

// Helper functions for creating mock responses
const createSuccessResponse = <T>(data: T): PostgrestSingleResponse<T> => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK'
});

const createErrorResponse = (message: string, code = 'ERROR'): PostgrestSingleResponse<any> => ({
  data: null,
  error: {
    message,
    details: '',
    hint: '',
    code
  } as PostgrestError,
  count: null,
  status: 400,
  statusText: 'Bad Request'
});

// Mock response queue
let mockResponseQueue: PostgrestSingleResponse<any>[] = [];
const getNextResponse = (): PostgrestSingleResponse<any> => {
  const response = mockResponseQueue.shift() || createErrorResponse('Unexpected end of mock responses');
  if (response.error && response.error.message === 'Organization not found') {
    throw new InviteError('Organization not found', InviteErrorCode.DATABASE_ERROR);
  }
  if (response.error && response.error.message === 'Database error') {
    throw new InviteError('A database error occurred', InviteErrorCode.DATABASE_ERROR);
  }
  return response;
};

// Mock Supabase client
vi.mock('../../lib/supabase', () => {
  type QueryBuilder = {
    select: () => QueryBuilder;
    insert: () => QueryBuilder;
    update: () => QueryBuilder;
    eq: () => QueryBuilder;
    order: () => QueryBuilder;
    single: () => Promise<PostgrestSingleResponse<any>>;
  };

  const createQueryBuilder = (): QueryBuilder => {
    const builder: QueryBuilder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      eq: () => builder,
      order: () => builder,
      single: () => Promise.resolve(getNextResponse())
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn().mockImplementation(() => {
        const builder = createQueryBuilder();
        return {
          ...builder,
          select: () => ({
            ...builder,
            eq: () => ({
              ...builder,
              order: () => getNextResponse()
            })
          }),
          update: () => ({
            ...builder,
            eq: () => getNextResponse()
          })
        };
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
      }
    }
  };
});

// Mock Email Service
vi.mock('../email', () => ({
  getEmailService: vi.fn().mockReturnValue({
    sendInvite: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('Invite Service', () => {
  const mockOrg = {
    id: 'test-org-id',
    name: 'Test Org'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponseQueue = [];
  });

  describe('createInvite', () => {
    const mockEmail = 'test@example.com';
    const mockRole = 'employee';

    it('should create invite successfully', async () => {
      mockResponseQueue = [
        createSuccessResponse(mockOrg),              // Organization lookup
        createSuccessResponse({ role: 'admin' }),    // Member check
        createErrorResponse('No rows returned', 'PGRST116'),  // No existing invite
        createSuccessResponse({ id: 'test-invite-id' }) // Create invite
      ];

      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(true);
      expect(result.inviteId).toBeDefined();
    });

    it('should handle duplicate invites', async () => {
      mockResponseQueue = [
        createSuccessResponse(mockOrg),              // Organization lookup
        createSuccessResponse({ role: 'admin' }),    // Member check
        createSuccessResponse({ id: 'existing-invite' }) // Existing invite found
      ];

      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been sent');
    });

    it('should validate email format', async () => {
      const result = await createInvite('invalid-email', mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should validate role', async () => {
      const result = await createInvite(mockEmail, 'invalid_role', mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('should verify organization exists', async () => {
      mockResponseQueue = [
        createErrorResponse('Organization not found')
      ];

      const result = await createInvite(mockEmail, mockRole, 'invalid-org-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Organization not found');
    });

    it('should handle email service errors', async () => {
      mockResponseQueue = [
        createSuccessResponse(mockOrg),              // Organization lookup
        createSuccessResponse({ role: 'admin' }),    // Member check
        createErrorResponse('No rows returned', 'PGRST116'),  // No existing invite
        createSuccessResponse({ id: 'test-invite-id' }) // Create invite
      ];

      vi.mocked(getEmailService().sendInvite).mockRejectedValueOnce(
        new Error('Failed to send invite email')
      );

      const result = await createInvite(mockEmail, mockRole, mockOrg.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send invite email');
    });
  });

  describe('listOrgInvites', () => {
    const mockInvites = [
      { id: 'invite-1', email: 'test1@example.com', status: 'pending' },
      { id: 'invite-2', email: 'test2@example.com', status: 'accepted' },
      { id: 'invite-3', email: 'test3@example.com', status: 'revoked' }
    ];

    it('should list invites successfully', async () => {
      mockResponseQueue = [createSuccessResponse(mockInvites)];
      const result = await listOrgInvites(mockOrg.id);
      expect(result).toEqual(mockInvites);
    });

    it('should handle database errors', async () => {
      mockResponseQueue = [createErrorResponse('Database error')];
      await expect(listOrgInvites(mockOrg.id)).rejects.toThrow(InviteError);
    });
  });

  describe('revokeInvite', () => {
    const mockInviteId = 'test-invite-id';

    it('should revoke invite successfully', async () => {
      mockResponseQueue = [createSuccessResponse(null)];
      const result = await revokeInvite(mockInviteId);
      expect(result).toBe(true);
    });

    it('should handle revocation errors', async () => {
      mockResponseQueue = [createErrorResponse('Database error')];
      const result = await revokeInvite(mockInviteId);
      expect(result).toBe(false);
    });
  });
});
