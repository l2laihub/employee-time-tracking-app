import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface OrganizationMemberDB {
  id: string;
  role: string;
  organization_id: string;
}

interface OrganizationMember {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
  };
}

import { toast } from 'sonner';
import Logo from '../components/Logo';

interface OrganizationInvite {
  id: string;
  organization_id: string;
  role: string;
  status: string;
  expires_at: string;
  organization: {
    id: string;
    name: string;
  };
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoiningOrg, setIsJoiningOrg] = useState(false);
  const { signUp } = useAuth();
  const { refreshOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const inviteCode = searchParams.get('code');
  const redirectPath = searchParams.get('redirect');
  const invitedEmail = searchParams.get('email');

  // Pre-fill email if provided in URL
  useEffect(() => {
    if (invitedEmail) {
      setEmail(decodeURIComponent(invitedEmail));
    }
  }, [invitedEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Sign up the user and wait for session to be established
      const { error: signUpError } = await signUp(email, password, firstName, lastName);
      if (signUpError) throw signUpError;

      // Get the current user to ensure we have the session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Failed to get user after signup');
      }

      console.log('User session established:', {
        userId: currentUser.id,
        email: currentUser.email
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
        email: email.toLowerCase(),
        now: new Date().toISOString()
      });

      if (inviteError) throw inviteError;

      if (inviteData) {
        console.log('Found invite, accepting:', inviteData);
        setIsJoiningOrg(true);
        
        // Show organization setup progress
        const toastId = toast.loading('Setting up your organization access...');
        
        try {
          // Accept the invite
          const { error: acceptError } = await supabase.rpc('accept_organization_invite', {
            p_invite_id: inviteData.id
          });

          if (acceptError) throw acceptError;

          // Wait for member to be created and retry a few times if needed
          let memberData: OrganizationMember | null = null;
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
                organization_id
              `)
              .eq('user_id', currentUser.id)
              .single();

            console.log(`Member check attempt ${retryCount + 1}:`, { data, error });

            if (!error && data) {
              const memberDbData = data as OrganizationMemberDB;
              // Fetch organization details
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', memberDbData.organization_id)
                .single();

              if (orgError) throw orgError;

              memberData = {
                id: memberDbData.id,
                role: memberDbData.role,
                organization: {
                  id: orgData.id,
                  name: orgData.name
                }
              };
              break;
            }

            retryCount++;
            console.log(`Retry ${retryCount}/${maxRetries} to fetch member data`);
          }

          if (!memberData) {
            throw new Error('Failed to verify organization membership after multiple retries');
          }

          // Create employee record
          const { error: employeeError } = await supabase
            .from('employees')
            .insert({
              organization_id: memberData.organization.id,
              member_id: memberData.id,
              first_name: firstName,
              last_name: lastName,
              email: email.toLowerCase(),
              role: memberData.role,
              start_date: new Date().toISOString().split('T')[0],
              status: 'active'
            });

          if (employeeError) throw employeeError;

          // Trigger organization context refresh and wait for update
          refreshOrganization();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verify organization membership
          let verifyRetryCount = 0;
          const verifyMaxRetries = 5;
          
          const verifyAndNavigate = async () => {
            console.log('Starting organization membership verification');
            
            while (verifyRetryCount < verifyMaxRetries) {
              try {
                const { data: memberCheck, error: memberCheckError } = await supabase
                  .from('organization_members')
                  .select('id')
                  .eq('user_id', currentUser.id)
                  .single();
                
                console.log(`Verification attempt ${verifyRetryCount + 1}:`, { memberCheck, memberCheckError });

                if (memberCheck) {
                  console.log('Organization membership confirmed, preparing to navigate to dashboard');
                  
                  // Ensure loading toast is dismissed before showing success
                  toast.dismiss(toastId);
                  
                  // Show success and explicitly navigate to dashboard
                  toast.success(`Successfully joined ${memberData.organization.name} as ${memberData.role}!`);
                  
                  // Force a refresh of the organization context
                  refreshOrganization();
                  
                  // Use a longer delay to ensure all state updates have completed
                  console.log('Setting timeout for dashboard navigation');
                  setTimeout(() => {
                    console.log('Executing delayed navigation to dashboard');
                    navigate('/dashboard', { replace: true });
                  }, 500);
                  
                  return true;
                }
              } catch (verifyError) {
                console.error('Error during verification:', verifyError);
              }

              verifyRetryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`Organization verification attempt ${verifyRetryCount}/${verifyMaxRetries}`);
            }
            
            return false;
          };
          
          const verified = await verifyAndNavigate();
          
          if (!verified) {
            // If we get here, verification failed
            toast.dismiss(toastId);
            toast.error('Could not verify organization access. Please try again.');

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
          currentUser: currentUser.id
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
                disabled={isLoading || isJoiningOrg}
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
                disabled={isLoading || isJoiningOrg}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isJoiningOrg ? (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  </span>
                  Setting up organization access...
                </>
              ) : isLoading ? (
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
