import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// This component is for development purposes only
// It allows developers to verify email addresses without actually receiving the verification email
export default function DevVerify() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // Only show this page in development mode
    if (process.env.NODE_ENV !== 'development') {
      navigate('/');
      return;
    }
    setIsDev(true);
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      // This requires admin privileges, so it will only work with direct database access
      // in a local development environment
      const { data, error } = await supabase
        .from('auth.users')
        .select('id, email, email_confirmed_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const verifyEmail = async (userId: string, userEmail: string) => {
    setLoading(true);
    try {
      // This is a development-only approach
      // In a real environment, users would click the link in their email
      
      // Option 1: Try to update the user directly (requires admin privileges)
      const { error } = await supabase
        .rpc('dev_verify_user_email', { user_id: userId });
      
      if (error) {
        console.error('Error verifying email:', error);
        toast.error('Failed to verify email. Check console for details.');
        return;
      }
      
      toast.success(`Email verified for ${userEmail}`);
      await fetchUsers();
    } catch (error) {
      console.error('Error verifying email:', error);
      toast.error('Failed to verify email. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isDev) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
        <p className="font-bold">Development Tool Only</p>
        <p>This page is only available in development mode and should never be deployed to production.</p>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Development Email Verification Tool</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Verify Email Manually</h2>
        <p className="mb-4">Enter the email address you want to verify:</p>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              const user = users.find(u => u.email === email);
              if (user) {
                verifyEmail(user.id, user.email);
              } else {
                toast.error('User not found');
              }
            }}
            disabled={loading || !email}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Users</h2>
        {users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email_confirmed_at ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!user.email_confirmed_at && (
                        <button
                          onClick={() => verifyEmail(user.id, user.email)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          Verify Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
