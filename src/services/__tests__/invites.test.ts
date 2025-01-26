import { describe, it, expect, vi } from 'vitest'
import { createInvite, listOrgInvites } from '../invites'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase')

describe('invite service', () => {
  it('creates invite with admin permissions', async () => {
    // Mock implementation that returns a promise directly
    const mockQueryBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'invite-123' }],
        error: null,
        count: 1,
        status: 201,
        statusText: 'Created'
      }),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      url: new URL('http://localhost'),
      headers: {},
      maybeSingle: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockReturnThis()
    };

    vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder);

    const result = await createInvite('admin@org.com', 'ADMIN', 'org-123', false)
    expect(result.success).toBe(true)
    expect(result.inviteId).toBe('invite-123')
  })

  it('lists organization invites', async () => {
    let mockInvites = [
      { id: 'invite-1', email: 'user1@org.com', role: 'MEMBER', organization_id: 'org-123' },
      { id: 'invite-2', email: 'user2@org.com', role: 'ADMIN', organization_id: 'org-123' }
    ];

    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((column: keyof typeof mockInvites[0], value) => {
        mockInvites = mockInvites.filter(invite => invite[column] === value);
        return mockQueryBuilder;
      }).mockReturnThis(),
      then: vi.fn().mockImplementation(function(resolve) {
        resolve({
          data: mockInvites,
          error: null
        });
      }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      url: new URL('http://localhost'),
      headers: {},
      maybeSingle: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockReturnThis()
    };

    vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder);

    const invites = await listOrgInvites('org-123')
    expect(invites).toHaveLength(2)
    expect(invites[0].role).toBe('MEMBER')
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123')
  })

  it('redirects invited user to organization dashboard on signup', async () => {
    const mockInvite = {
      id: 'invite-123',
      email: 'user@org.com',
      role: 'MEMBER', 
      organization_id: 'org-123',
      created_at: new Date().toISOString()
    };

    // Mock invite check
    const mockInviteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockInvite,
        error: null
      }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      url: new URL('http://localhost'),
      headers: {},
      maybeSingle: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockReturnThis()
    };

    // Mock organization member insert
    const mockMemberInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'member-123' }],
        error: null,
        count: 1,
        status: 201,
        statusText: 'Created'
      }),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      url: new URL('http://localhost'),
      headers: {},
      maybeSingle: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockReturnThis()
    };

    vi.mocked(supabase.from)
      .mockImplementationOnce(() => mockInviteQuery) // For invite check
      .mockImplementationOnce(() => mockMemberInsert); // For member insertion

    const result = await createInvite('user@org.com', 'MEMBER', 'org-123', true);

    // Verify invite was created
    expect(result.success).toBe(true);
    
    // Verify organization membership was created
    expect(mockMemberInsert.insert).toHaveBeenCalledWith({
      user_id: expect.any(String),
      organization_id: 'org-123',
      role: 'MEMBER'
    });

    // Verify user is redirected to organization dashboard
    expect(result.redirectTo).toBe('/dashboard/org-123');
  });

  it('handles missing invite during signup', async () => {
    const mockInviteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'No invite found' }
      }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      url: new URL('http://localhost'),
      headers: {},
      maybeSingle: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockReturnThis()
    };

    vi.mocked(supabase.from).mockImplementation(() => mockInviteQuery);

    const result = await createInvite('user@org.com', 'MEMBER', 'org-123', true);
    
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no active invite found/i);
  });
})
