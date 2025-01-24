import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { UserPlus, X, Clock, Check } from 'lucide-react';

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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');

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
    if (!email || !role || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: organization.id,
        p_email: email,
        p_role: role
      });

      if (error) throw error;

      toast.success('Invite sent successfully');
      setEmail('');
      fetchInvites();
    } catch (error) {
      console.error('Error creating invite:', error);
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
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? 'Sending...' : 'Send Invite'}
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
