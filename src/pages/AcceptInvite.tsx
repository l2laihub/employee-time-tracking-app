import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface InviteDetails {
  email: string;
  organization_name: string;
  expires_at: string;
  status: string;
}

export default function AcceptInvite() {
  const { inviteId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const codeFromQuery = searchParams.get('code');
  const navigate = useNavigate();
  const { user } = useAuth();
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

  useEffect(() => {
    console.log('User or invite changed', { 
      userEmail: user?.email, 
      inviteEmail: invite?.email,
      isMatch: invite && user && invite.email === user.email 
    });
    
    if (invite && user && invite.email === user.email) {
      acceptInvite();
    }
  }, [invite, user]);

  const validateInvite = async () => {
    console.log('Validating invite:', inviteCode);
    try {
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
          navigate('/');
          return;
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
    console.log('Accepting invite', { inviteCode, userId: user?.id });
    try {
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
        throw new Error(data.error);
      }

      toast.success('Successfully joined organization');
      navigate('/');
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
    console.log('Wrong account detected', { userEmail: user.email, inviteEmail: invite.email });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Wrong Account</h1>
          <p className="text-gray-600 mb-4">
            This invite is for {invite.email}.<br />
            Please log in with the correct account.
          </p>
          <Link
            to={`/login?redirect=/accept-invite/${inviteCode}&email=${encodeURIComponent(invite.email)}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Log in with {invite.email}
          </Link>
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
