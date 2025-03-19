import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';

interface InviteDetails {
  email: string;
  organization_name: string;
  expires_at: string;
  status: string;
  organization_id: string;
}

export default function AcceptInvite() {
  const { inviteId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const codeFromQuery = searchParams.get('code');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  // Get invite ID from either route param or query param
  const inviteCode = inviteId || codeFromQuery;

  useEffect(() => {
    console.log('AcceptInvite mounted', {
      inviteId,
      codeFromQuery,
      inviteCode,
      userEmail: user?.email,
      pathname: location.pathname,
      search: location.search
    });

    if (inviteCode) {
      validateInvite();
    } else {
      console.error('No invite code found');
      setError('Invalid invite link');
      setLoading(false);
    }
  }, [inviteCode]);

  // Re-validate when user changes (e.g., after signup)
  useEffect(() => {
    if (inviteCode && user) {
      console.log('User changed or became available, re-validating invite', {
        inviteCode,
        userId: user.id,
        userEmail: user.email,
        isLoading: loading
      });
      validateInvite();
    }
  }, [user, inviteCode]);

  useEffect(() => {
    console.log('User or invite changed', {
      userEmail: user?.email,
      inviteEmail: invite?.email,
      isMatch: invite && user && invite.email === user.email
    });
    
    if (invite && user && invite.email === user.email) {
      acceptInvite();
    }
  }, [invite, user, inviteCode]);

  const validateInvite = async () => {
    console.log('Validating invite:', inviteCode);
    try {
      // First, check if the invite exists directly in the database
      const { data: inviteData, error: inviteQueryError } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('id', inviteCode)
        .single();
      
      console.log('Direct invite query result:', { inviteData, inviteQueryError });
      
      // Now call the validation function
      const { data, error } = await supabase.rpc('validate_organization_invite', {
        p_invite_id: inviteCode
      });

      console.log('Validate invite response:', { data, error });

      if (error) {
        console.error('Validation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data.success) {
        console.log('Invite validation failed:', data.error);
        
        // If the invite was already accepted and user is logged in,
        // redirect them to the dashboard instead of showing an error
        if (data.error === 'Invite already accepted' && user) {
          toast.success('You have already joined this organization');
          console.log('Invite already accepted, navigating to dashboard');
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // If invite not found but user is logged in, check if they're already a member
        if (data.error === 'Invite not found or already used' && user) {
          console.log('Checking if user is already a member of an organization');
          
          const { data: memberData, error: memberError } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          console.log('Organization membership check:', { memberData, memberError });
          
          if (memberData) {
            toast.success('You are already a member of an organization');
            console.log('User is already a member, navigating to dashboard');
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        
        setError(data.error);
        setLoading(false);
        return;
      }

      const inviteDetails: InviteDetails = data.invite;
      console.log('Parsed invite details:', inviteDetails);

      setInvite(inviteDetails);
      setLoading(false);
    } catch (error: any) {
      console.error('Error validating invite:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack
      });
      setError('Invalid invite');
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    console.log('Accepting invite', {
      inviteCode,
      userId: user?.id,
      userEmail: user?.email,
      inviteEmail: invite?.email
    });
    
    try {
      // First, check if the user is already a member of this organization
      if (invite?.organization_id) {
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', user?.id)
          .eq('organization_id', invite.organization_id)
          .maybeSingle();
          
        console.log('Checking existing membership:', { memberData, memberError });
        
        if (memberData) {
          console.log('User is already a member of this organization');
          toast.success('You are already a member of this organization');
          
          // Refresh organization context before navigating
          refreshOrganization();
          
          // Add a small delay to ensure context is updated
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
          return;
        }
      }

      const { data, error } = await supabase.rpc('accept_organization_invite', {
        p_invite_id: inviteCode,
        p_user_id: user?.id
      });

      console.log('Accept invite response:', {
        data,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null
      });

      if (error) throw error;

      if (!data.success) {
        // If the invite was not found but user is logged in, check if they're already a member
        if (data.error === 'Invite not found or already used' && user) {
          console.log('Checking if user is already a member of an organization after failed accept');
          
          const { data: memberData, error: memberError } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          console.log('Organization membership check after failed accept:', { memberData, memberError });
          
          if (memberData) {
            toast.success('You are already a member of an organization');
            console.log('User is already a member, navigating to dashboard');
            
            // Refresh organization context before navigating
            refreshOrganization();
            
            // Add a small delay to ensure context is updated
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1000);
            return;
          }
        }
        
        throw new Error(data.error);
      }

      console.log('Successfully joined organization, refreshing context and navigating to dashboard');
      toast.success('Successfully joined organization');
      
      // Refresh organization context before navigating
      refreshOrganization();
      
      // Add a small delay to ensure context is updated
      setTimeout(() => {
        // Use replace: true to ensure clean navigation history
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (error: any) {
      console.error('Error accepting invite:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack
      });
      setError(error.message || 'Failed to accept invite');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  if (!user) {
    console.log('Showing login/signup options for:', invite.email);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join {invite.organization_name}</h1>
            <p className="text-gray-600">You've been invited to join {invite.organization_name}</p>
          </div>

          <div className="space-y-4">
            <Link
              to={`/login?redirect=/accept-invite/${inviteCode}&email=${encodeURIComponent(invite.email)}`}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Log in with {invite.email}
            </Link>

            <div className="text-center">
              <span className="text-gray-500">or</span>
            </div>

            <Link
              to={`/signup?redirect=/accept-invite/${inviteCode}&email=${encodeURIComponent(invite.email)}`}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Create new account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.email !== invite.email) {
    console.log('Account mismatch detected', { userEmail: user.email, inviteEmail: invite.email });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-yellow-500 text-xl mb-4">⚠️</div>
              <h1 className="text-xl font-semibold text-gray-900 mb-4">Different Account Detected</h1>
              
              {/* Current account info */}
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">Currently logged in as:</p>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>

              {/* Explanation */}
              <p className="text-gray-600 mb-6">
                This invitation was sent to <span className="font-medium">{invite.email}</span> to join{' '}
                <span className="font-medium">{invite.organization_name}</span>.
              </p>

              {/* Action options */}
              <div className="space-y-3">
                <Link
                  to={`/login?redirect=/accept-invite/${inviteCode}&email=${encodeURIComponent(invite.email)}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Switch to {invite.email}
                </Link>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate(`/login?redirect=/accept-invite/${inviteCode}&email=${encodeURIComponent(invite.email)}`);
                  }}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Log out and sign in with {invite.email}
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Joining {invite.organization_name}...</p>
      </div>
    </div>
  );
}
