import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import type { Database } from '../../types/database.types';

type OrganizationInvite = Database['public']['Tables']['organization_invites']['Row'];

export function AcceptInvite() {
  const navigate = useNavigate();
  const { setCurrentOrganization } = useOrganization();
  const [inviteCode] = useState(() => new URLSearchParams(window.location.search).get('code'));
  const [invite, setInvite] = useState<OrganizationInvite | null>(null);
  const [organization, setOrganization] = useState<Database['public']['Tables']['organizations']['Row'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      loadInviteDetails();
    }
  }, [inviteCode]);

  const loadInviteDetails = async () => {
    try {
      // Get invite details
      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organizations(*)')
        .eq('invite_code', inviteCode)
        .single();

      if (inviteError) throw inviteError;
      if (!inviteData) throw new Error('Invite not found');

      // Check if invite is expired
      if (new Date(inviteData.expires_at) < new Date()) {
        throw new Error('This invite has expired');
      }

      setInvite(inviteData);
      setOrganization(inviteData.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite || !organization) return;

    setIsAccepting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user's email matches invite
      if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error('This invite is for a different email address');
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) throw memberError;

      // Delete the invite
      await supabase
        .from('organization_invites')
        .delete()
        .eq('id', invite.id);

      // Update user's profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          organization_id: organization.id,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Update organization context
      setCurrentOrganization(organization);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <p className="text-center text-gray-500">Loading invite details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Invalid Invite</h3>
              <p className="mt-2 text-sm text-gray-500">{error || 'Invite not found'}</p>
              <button
                onClick={() => navigate('/select-organization')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Organizations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Join {organization.name}</h3>
            <p className="mt-2 text-sm text-gray-500">
              You've been invited to join {organization.name} as a {invite?.role}.
            </p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleAcceptInvite}
              disabled={isAccepting}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isAccepting ? 'Accepting...' : 'Accept Invite'}
            </button>

            <button
              onClick={() => navigate('/select-organization')}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
