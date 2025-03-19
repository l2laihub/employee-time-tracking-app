import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import Logo from '../components/Logo';
import { User } from '@supabase/supabase-js';

// Main Signup component
export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isJoiningOrg, setIsJoiningOrg] = useState(false);
  const [showConfirmationScreen, setShowConfirmationScreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const { refreshOrganization } = useOrganization();
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect');
  const invitedEmail = searchParams.get('email');

  // Pre-fill email if provided in URL
  React.useEffect(() => {
    if (invitedEmail) {
      setEmail(decodeURIComponent(invitedEmail));
    }
  }, [invitedEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Sign up the user and wait for session to be established
      const { error: signUpError, emailConfirmationRequired, user: signUpUser } = await signUp(email, password, firstName, lastName);
      if (signUpError) throw signUpError;

      // If email confirmation is required, show confirmation screen
      if (emailConfirmationRequired) {
        console.log('Email confirmation required for:', email);
        setShowConfirmationScreen(true);
        return;
      }

      // For development mode, we might have a mock user directly from signUp
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // If we have a user from signUp (which could be our mock user), use it directly
      if (signUpUser) {
        console.log('Using user from signUp:', signUpUser.id);
        handleUserSignedUp(signUpUser);
        return;
      }

      // Otherwise, get the current user from Supabase
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        if (isDevelopment) {
          console.error('Development mode, but no mock user was returned');
        }
        throw new Error('No user available after signup');
      }

      // Handle the successful signup
      handleUserSignedUp(currentUser);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Error signing up');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to handle a successful signup
  const handleUserSignedUp = async (user: User) => {
    console.log('User session established:', {
      userId: user.id,
      email: user.email
    });

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
      hasInvite: !!inviteData 
    });

    if (inviteError) {
      console.error('Error checking for invites:', inviteError);
    }

    // If there's a pending invite, automatically accept it
    if (inviteData) {
      // Debug the structure of the organization data
      console.log('Organization data structure:', {
        organization: inviteData.organization,
        type: typeof inviteData.organization,
        isArray: Array.isArray(inviteData.organization),
        keys: inviteData.organization ? Object.keys(inviteData.organization) : []
      });
      
      // Safely extract organization name
      let organizationName = 'Organization';
      try {
        if (inviteData.organization) {
          if (typeof inviteData.organization === 'object') {
            if ('name' in inviteData.organization) {
              organizationName = String(inviteData.organization.name);
            }
          }
        }
      } catch (e) {
        console.error('Error extracting organization name:', e);
      }
      
      console.log('Found pending invite for organization:', organizationName);
      setIsJoiningOrg(true);
      
      const toastId = toast.loading(`Joining ${organizationName}...`);
      
      try {
        // Accept the invite
        const { error: acceptError } = await supabase
          .from('organization_invites')
          .update({ status: 'accepted' })
          .eq('id', inviteData.id);
        
        if (acceptError) {
          console.error('Error accepting invite:', acceptError);
          toast.dismiss(toastId);
          toast.error(`Failed to join ${organizationName}`);
          throw acceptError;
        }
        
        // Create the organization member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: inviteData.organization_id,
            user_id: user.id,
            role: inviteData.role
          });
        
        if (memberError) {
          console.error('Error creating organization member:', memberError);
          toast.dismiss(toastId);
          toast.error(`Failed to join ${organizationName}`);
          throw memberError;
        }
        
        // Wait for the organization member to be created and visible
        let retries = 0;
        const maxRetries = 5;
        let memberConfirmed = false;
        
        while (retries < maxRetries && !memberConfirmed) {
          console.log(`Checking for organization membership (attempt ${retries + 1}/${maxRetries})...`);
          
          // Wait a bit before checking
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if the member exists
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('id, role, organization_id')
            .eq('user_id', user.id)
            .eq('organization_id', inviteData.organization_id)
            .maybeSingle();
          
          if (memberData) {
            console.log('Organization membership confirmed:', memberData);
            memberConfirmed = true;
            
            // Refresh the organization context
            await refreshOrganization();
            
            toast.dismiss(toastId);
            toast.success(`You've joined ${organizationName}!`);
            
            // Navigate to the organization
            navigate('/', { replace: true });
            return;
          }
          
          retries++;
        }
        
        if (!memberConfirmed) {
          toast.dismiss(toastId);
          toast.warning('Organization joined, but membership not confirmed yet. Please try logging in again.');
          console.warn('Organization membership not confirmed after retries');
          navigate('/');
        }
      } catch (error) {
        toast.dismiss(toastId);
        throw error;
      } finally {
        setIsJoiningOrg(false);
      }
    } else {
      // Handle redirects after signup
      console.log('Handling post-signup navigation:', {
        redirectPath,
        hasInvite: redirectPath?.includes('accept-invite'),
        currentUser: user.id
      });
      
      if (redirectPath) {
        // If we have a redirect to an invite acceptance page, go there
        if (redirectPath.includes('accept-invite')) {
          console.log('Redirecting to accept invite page:', redirectPath);
          navigate(redirectPath, { replace: true });
        } else {
          // For other redirects, follow them
          console.log('Redirecting to specified path:', redirectPath);
          navigate(redirectPath, { replace: true });
        }
      } else {
        // No redirect path, go to organization creation
        console.log('No redirect path, going to organization creation');
        navigate('/create-organization', { replace: true });
      }
    }
  };

  // Render the email confirmation screen
  if (showConfirmationScreen) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verification Required</h2>
              <p className="text-gray-600 mb-4">
                We've sent a confirmation link to <span className="font-medium text-gray-900">{email}</span>
              </p>
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 text-sm text-blue-700">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1 text-left">
                      <li>Please check your email inbox for the verification link</li>
                      <li>You must verify your email before you can log in</li>
                      <li>If you don't see the email, check your spam or junk folder</li>
                      <li>The verification link is valid for 24 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-4">
                <Link to="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Go to Login
                </Link>
                <button
                  type="button"
                  onClick={() => setShowConfirmationScreen(false)}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isJoiningOrg}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isSubmitting || isJoiningOrg
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    Processing...
                  </>
                ) : isJoiningOrg ? (
                  'Joining organization...'
                ) : (
                  'Sign up'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
