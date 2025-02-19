import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/custom.types';
import { useAuth } from './AuthContext';
import { Organization } from '../types/supabase.types';
import { createInvite } from '../services/invites';
import { useEmail } from './EmailContext';

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
  refreshOrganization: () => void;
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
        .select('organization_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (!memberData) {
        console.log('No organization membership found');
        setOrganization(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Then get the organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.organization_id)
        .single();

      if (orgError) {
        throw orgError;
      }

      console.log('Setting organization and role:', {
        org: orgData,
        role: memberData.role
      });

      setOrganization(orgData);
      setUserRole(memberData.role as UserRole);
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
  
  const refreshOrganization = () => {
    console.log('Manual organization refresh triggered');
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
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('Creating organization with name:', name);
      setIsLoading(true);
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const { data, error } = await supabase
        .rpc('create_organization_transaction', {
          p_name: name,
          p_slug: slug,
          p_user_id: user.id,
          p_branding: null
        });

      console.log('Create organization response:', { data, error });

      if (error) {
        console.error('Create organization error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Fetch the newly created organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', data.organization_id)
        .single();

      if (orgError) throw orgError;

      console.log('Setting newly created organization:', orgData);
      setOrganization(orgData);
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
      throw err;
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
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: currentUser.id,
          role: invite.role,
        });

      if (memberError) throw memberError;

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
