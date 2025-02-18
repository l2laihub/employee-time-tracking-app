import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useEmail } from '../contexts/EmailContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { UserPlus, X, Clock, Check } from 'lucide-react';
import { createInvite as createInviteService } from '../services/invites';

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function OrganizationInvites() {
  const { organization } = useOrganization();
  const { isInitialized: isEmailInitialized, error: emailError } = useEmail();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');
  const [error, setError] = useState<string | null>(null);
  const isDevelopment = import.meta.env.MODE === 'development';

  // Fetch invites
  useEffect(() => {
    if (organization?.id) {
      fetchInvites();
    }
  }, [organization?.id]);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', organization?.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load invites');
    }
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = new Date();
    
    console.log('Starting invite process...', {
      email,
      role,
      isEmailInitialized,
      hasEmailError: !!emailError,
      isDevelopment,
      timestamp: startTime.toISOString()
    });

    if (!email || !role || !organization?.id) {
      console.error('Missing required fields:', { email, role, orgId: organization?.id });
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isEmailInitialized) {
      console.error('Email service not initialized:', { emailError });
      toast.error('Email service not ready. Please try again.');
      return;
    }

    if (emailError) {
      console.error('Email service error:', emailError);
      toast.error('Email service error. Please check configuration.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Creating invite...', {
        email,
        role,
        organizationId: organization.id,
        isDevelopment,
        timestamp: new Date().toISOString()
      });

      const result = await createInviteService(email, role, organization.id);
      
      if (!result.success) {
        console.error('Invite creation failed:', {
          error: result.error,
          inviteId: result.inviteId,
          timestamp: new Date().toISOString()
        });

        // Show different error messages based on the error type
        if (result.error?.includes('verified email addresses')) {
          toast.error(`Email not verified. Please use the verified email: ${isDevelopment ? 'l2laihub@gmail.com' : 'any email'}`);
        } else if (result.error?.includes('Failed to send invite email')) {
          toast.error('Failed to send invite email. The invite was created but email delivery failed.');
          setEmail(''); // Clear the form since the invite was created
          fetchInvites(); // Refresh to show the failed invite
        } else {
          toast.error(result.error || 'Failed to create invite');
        }
        setError(result.error || 'Failed to create invite');
      } else {
        console.log('Invite created and email sent successfully:', {
          result,
          timestamp: new Date().toISOString()
        });
        
        setEmail('');
        toast.success('Invite sent successfully');
        fetchInvites();
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invite');
      toast.error('Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRevoking(inviteId);
    try {
      const { error } = await supabase
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Invite revoked successfully');
      fetchInvites();
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Failed to revoke invite');
    } finally {
      setRevoking(null);
    }
  };

  const filteredInvites = invites.filter(invite => invite.status === activeTab);

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage Invites</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite new members to join your organization.
          </p>
        </div>

        {/* Invite Form */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invite Members</h2>
          <p className="text-sm text-gray-500 mb-4">
            Send invites to new team members to join your organization.
          </p>

          {isDevelopment && (
            <div className="mb-4 p-4 rounded-md bg-yellow-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Development Mode Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>In development mode, emails can only be sent to verified email addresses.</p>
                    <p className="mt-1">Please use: l2laihub@gmail.com for testing.</p>
                    <div className="mt-2">
                      <p>Email Service Status:</p>
                      <ul className="list-disc ml-4 mt-1">
                        <li className={isEmailInitialized ? "text-green-600" : "text-red-600"}>
                          Service Status: {isEmailInitialized ? "Initialized" : "Not Initialized"}
                        </li>
                        {emailError && (
                          <li className="text-red-600">
                            Error: {emailError.message}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={createInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                disabled={loading}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !isEmailInitialized || !!emailError}
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Invite...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </button>
          </form>
        </div>

        {/* Invites List */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('pending')}
                className={`${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Clock className="mr-2 h-4 w-4" />
                Pending Invites
                {invites.filter(i => i.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                    {invites.filter(i => i.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('accepted')}
                className={`${
                  activeTab === 'accepted'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Check className="mr-2 h-4 w-4" />
                Accepted Invites
                {invites.filter(i => i.status === 'accepted').length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                    {invites.filter(i => i.status === 'accepted').length}
                  </span>
                )}
              </button>
            </nav>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {activeTab === 'pending' ? 'Expires' : 'Accepted'}
                    </th>
                    {activeTab === 'pending' && (
                      <th className="relative px-3 py-3.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvites.map((invite) => (
                    <tr key={invite.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{invite.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{invite.role}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {activeTab === 'pending' 
                          ? new Date(invite.expires_at).toLocaleDateString()
                          : new Date(invite.accepted_at!).toLocaleDateString()
                        }
                      </td>
                      {activeTab === 'pending' && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                          <button
                            onClick={() => revokeInvite(invite.id)}
                            disabled={revoking === invite.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <X className="mr-1 h-3 w-3" />
                            {revoking === invite.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredInvites.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'pending' ? 4 : 3} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No {activeTab} invites
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
