import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/custom.types';
import { useAuth } from './AuthContext';
import { Organization } from '../types/supabase.types';
import { createInvite } from '../services/invites';
import { useEmail } from './EmailContext';
import { createOrganizationFallback } from '../utils/organizationUtils';

// Default PTO structure
const DEFAULT_PTO = {
  vacation: {
    beginningBalance: 0,
    accrualRate: 6.67, // 80 hours per year ÷ 12 months
    accrued: 0,
    used: 0,
    pending: 0,
    carryover: 0
  },
  sick: {
    beginningBalance: 0,
    accrualRate: 3.33, // 40 hours per year ÷ 12 months
    accrued: 0,
    used: 0,
    pending: 0,
    carryover: 0
  }
};

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  userRole: UserRole | null;
  createOrganization: (name: string) => Promise<void>;
  joinOrganization: (inviteCode: string) => Promise<void>;
  leaveOrganization: () => Promise<void>;
  sendInvite: (email: string, role: UserRole) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteCode: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  console.log('Initializing OrganizationProvider...');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isInitialized: isEmailInitialized, error: emailError } = useEmail();

  useEffect(() => {
    if (emailError) {
      console.error('Email service initialization error:', emailError);
    }
  }, [emailError]);

  const fetchUserOrganization = async () => {
    console.log('fetchUserOrganization called:', {
      authLoading,
      userId: user?.id,
      userEmail: user?.email?.toLowerCase(),
      currentOrg: organization?.id,
      currentRole: userRole
    });

    if (authLoading) {
      console.log('Auth is still loading, skipping fetch');
      return;
    }

    try {
      if (!user) {
        console.log('No user found, clearing organization data');
        setOrganization(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      console.log('Fetching organization for user:', user.id);
      setIsLoading(true);

      // First get the organization member record
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      // Filter out any memberships with null organization_id
      const validMemberships = (memberData || []).filter(m => m.organization_id);

      if (!validMemberships || validMemberships.length === 0) {
        console.log('No valid organization membership found');
        setOrganization(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Use the most recent membership
      const latestMembership = validMemberships[0];
      console.log('Found valid membership:', latestMembership);

      // Then get the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', latestMembership.organization_id)
        .single();

      if (orgError) {
        throw orgError;
      }

      console.log('Setting organization and role:', {
        org: orgData,
        role: latestMembership.role
      });

      setOrganization(orgData);
      setUserRole(latestMembership.role as UserRole);
      setError(null);
    } catch (err) {
      console.error('Error in fetchUserOrganization:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
    } finally {
      console.log('Fetch completed, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Add a refresh trigger for manual refreshes
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const refreshOrganization = async () => {
    console.log('Manual organization refresh triggered');
    
    // Force immediate refresh
    try {
      if (!user) {
        console.log('No user found, skipping refresh');
        return;
      }
      
      console.log('Refreshing organization for user:', user.id);
      setIsLoading(true);
  
      // First get the organization member record
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
  
      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }
  
      // Filter out any memberships with null organization_id
      const validMemberships = (memberData || []).filter(m => m.organization_id);
  
      if (!validMemberships || validMemberships.length === 0) {
        console.log('No valid organization membership found during refresh');
        setOrganization(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }
  
      // Use the most recent membership
      const latestMembership = validMemberships[0];
      console.log('Found valid membership during refresh:', latestMembership);
  
      // Then get the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', latestMembership.organization_id)
        .single();
  
      if (orgError) {
        throw orgError;
      }
  
      console.log('Setting organization and role during refresh:', {
        org: orgData,
        role: latestMembership.role
      });
  
      setOrganization(orgData);
      setUserRole(latestMembership.role as UserRole);
      setError(null);
    } catch (err) {
      console.error('Error in refreshOrganization:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      setError(err instanceof Error ? err : new Error('Failed to refresh organization'));
    } finally {
      console.log('Refresh completed, setting isLoading to false');
      setIsLoading(false);
    }
    
    // Also trigger the effect by updating the refreshTrigger
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    console.log('Organization effect triggered:', {
      userId: user?.id,
      authLoading,
      hasOrg: !!organization,
      orgId: organization?.id,
      isLoading,
      userRole,
      refreshTrigger
    });
    fetchUserOrganization();
  }, [user?.id, authLoading, refreshTrigger]);

  const createOrganization = async (name: string) => {
    try {
      console.log('Getting current user session...');
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser) {
        console.error('No current user session found');
        throw new Error('User not authenticated');
      }

      console.log('Creating organization with name:', name);
      setIsLoading(true);
      
      // Skip the transaction function entirely and use the fallback method directly
      console.log('Using direct organization creation method...');
      const result = await createOrganizationFallback(supabase, name, currentUser);
      
      console.log('Organization creation successful:', result);
      setOrganization(result.organization);
      setUserRole('admin' as UserRole);
      setError(null);
    } catch (err) {
      console.error('Error creating organization:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      setError(err as Error);
      throw err; // Re-throw to allow handling in the UI
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvite = async (email: string, role: UserRole) => {
    if (!organization) throw new Error('No organization selected');
    if (!isEmailInitialized) throw new Error('Email service not initialized');
    if (emailError) throw emailError;

    try {
      console.log('Sending invite:', { email, role, organizationId: organization.id });
      const result = await createInvite(email, role, organization.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send invite');
      }

      console.log('Invite sent successfully');
    } catch (err) {
      console.error('Error in sendInvite:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      throw err;
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!organization) throw new Error('No organization selected');

    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId)
        .eq('organization_id', organization.id);

      if (error) throw error;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to revoke invite');
    }
  };

  const acceptInvite = async (inviteCode: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) throw new Error('User not authenticated or email not found');

      // Check if user already has an organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (existingMember) {
        throw new Error('User already belongs to an organization');
      }

      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select(`
          *,
          organization:organizations (*)
        `)
        .eq('invite_code', inviteCode)
        .single();

      if (inviteError) throw inviteError;
      if (!invite) throw new Error('Invite not found');

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('This invite has expired');
      }

      // Check if user's email matches invite
      if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error('This invite is for a different email address');
      }

      // Add user to organization
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: currentUser.id,
          role: invite.role,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Create employee record using the member_id
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          member_id: memberData.id,
          organization_id: invite.organization_id,
          first_name: currentUser.user_metadata?.first_name || '',
          last_name: currentUser.user_metadata?.last_name || '',
          email: currentUser.email,
          status: 'active',
          role: invite.role,
          start_date: new Date().toISOString().split('T')[0], // Required: current date
          pto: DEFAULT_PTO // Required: default PTO structure
        });

      if (employeeError) throw employeeError;

      // Delete the invite
      await supabase
        .from('organization_invites')
        .delete()
        .eq('id', invite.id);

      setOrganization(invite.organization);
      setUserRole(invite.role);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to accept invite');
    }
  };

  const joinOrganization = async (inviteCode: string) => {
    try {
      await acceptInvite(inviteCode);
      navigate('/');
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to join organization');
    }
  };

  const leaveOrganization = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('organization_id', organization?.id);

      if (error) throw error;

      setOrganization(null);
      setUserRole(null);
      navigate('/select-organization');
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to leave organization');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        error,
        userRole,
        createOrganization,
        joinOrganization,
        leaveOrganization,
        sendInvite,
        revokeInvite,
        acceptInvite,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
