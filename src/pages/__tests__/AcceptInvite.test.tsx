import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth, AuthContextType } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AcceptInvite from '../AcceptInvite';
import { User } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../lib/supabase');
vi.mock('react-hot-toast');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ inviteId: 'test-invite-id' })
  };
});

describe('AcceptInvite', () => {
  const mockInvite = {
    email: 'test@example.com',
    organization: { name: 'Test Org' },
    expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    status: 'pending'
  };

  const mockAuthContext: AuthContextType = {
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
  };

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuthContext });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInvite, error: null })
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    expect(screen.getByText('Processing your invite...')).toBeInTheDocument();
  });

  it('should show login/signup options for non-authenticated users', async () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuthContext });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInvite, error: null })
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(`Join ${mockInvite.organization.name}`)).toBeInTheDocument();
      expect(screen.getByText(`Log in with ${mockInvite.email}`)).toBeInTheDocument();
      expect(screen.getByText('Create new account')).toBeInTheDocument();
    });
  });

  it('should show wrong account message when emails do not match', async () => {
    const wrongUser = { ...mockUser, email: 'wrong@example.com' };
    vi.mocked(useAuth).mockReturnValue({ 
      ...mockAuthContext,
      user: wrongUser
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInvite, error: null })
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Wrong Account')).toBeInTheDocument();
      expect(screen.getByText(`This invite is for ${mockInvite.email}.`)).toBeInTheDocument();
    });
  });

  it('should accept invite when user is authenticated with correct email', async () => {
    vi.mocked(useAuth).mockReturnValue({ 
      ...mockAuthContext,
      user: mockUser
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInvite, error: null })
    } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: { success: true }, 
      error: null 
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error message when invite is invalid', async () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockAuthContext });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Invite not found') })
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invalid Invite')).toBeInTheDocument();
    });
  });

  it('should show error when invite is expired', async () => {
    const expiredInvite = {
      ...mockInvite,
      expires_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    };

    vi.mocked(useAuth).mockReturnValue({ ...mockAuthContext });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: expiredInvite, error: null })
    } as any);

    render(
      <BrowserRouter>
        <AcceptInvite />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('This invite has expired')).toBeInTheDocument();
    });
  });
});