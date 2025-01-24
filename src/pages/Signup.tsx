import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Sign up the user
      const { error: signUpError } = await signUp(email, password, firstName, lastName);
      if (signUpError) throw signUpError;

      // Sign in immediately after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // Debug: Check all invites for this email
      const { data: allInvites, error: debugError } = await supabase
        .rpc('debug_organization_invites', {
          p_email: email.toLowerCase()
        });
      console.log('Debug - All invites for email:', { allInvites, debugError });

      // Check for pending invites
      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .select(`
          id,
          organization_id,
          role,
          status,
          expires_at,
          organization:organizations (
            name
          )
        `)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      console.log('Invite check result:', { 
        inviteData, 
        inviteError,
        email: email.toLowerCase(),
        now: new Date().toISOString()
      });

      if (inviteError) throw inviteError;

      if (inviteData) {
        console.log('Found invite, accepting:', inviteData);
        // Accept the invite
        const { error: acceptError } = await supabase.rpc('accept_organization_invite', {
          p_invite_id: inviteData.id
        });

        if (acceptError) throw acceptError;

        // Wait for member to be created and retry a few times if needed
        let memberData = null;
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        while (!memberData && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          const { data, error } = await supabase
            .from('organization_members')
            .select(`
              id,
              role,
              organization:organizations (
                name
              )
            `)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .single();

          console.log(`Member check attempt ${retryCount + 1}:`, { data, error });

          if (!error && data) {
            memberData = data;
            break;
          }

          retryCount++;
          console.log(`Retry ${retryCount}/${maxRetries} to fetch member data`);
        }

        if (!memberData) {
          throw new Error('Failed to verify organization membership after multiple retries');
        }

        toast.success(`Account created and joined ${memberData.organization.name} as ${memberData.role}!`);
      } else {
        toast.success('Account created successfully!');
      }

      // Navigate to the app
      navigate('/');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Logo className="mx-auto" />
          <p className="mt-2 text-center text-sm text-gray-600">
            Create an account to start tracking your time with ClockFlow
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  </span>
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-sm text-blue-600 hover:text-blue-500"
            tabIndex={isLoading ? -1 : 0}
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
