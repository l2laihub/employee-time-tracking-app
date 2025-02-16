import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { UserRole } from '../types/custom.types';
import { sendInviteEmail, sendWelcomeEmail } from '../lib/email';
import { useAuth } from './AuthContext';

type Organization = Database['public']['Tables']['organizations']['Row'];
type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
type OrganizationInvite = Database['public']['Tables']['organization_invites']['Row'];

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

      // Get user's organization membership and organization details with retries
      let memberData = null;
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      while (!memberData && retryCount < maxRetries) {
        const { data, error } = await supabase
          .from('organization_members')
          .select(`
            id,
            organization_id,
            user_id,
            role::text,
            permissions,
            created_at,
            organization:organizations (
              id,
              name,
              slug,
              created_at,
              updated_at,
              branding,
              settings
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        console.log(`Member data check (attempt ${retryCount + 1}/${maxRetries}):`, { data, error });

        // Only throw error if it's not a "no rows" error
        if (error && error.code !== 'PGRST116') {
          console.error('Member error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        if (data) {
          memberData = data;
          break;
        }

        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (memberData) {
        console.log('Setting organization and role from membership:', {
          org: memberData.organization,
          role: memberData.role
        });
        setOrganization(memberData.organization);
        setUserRole(memberData.role as UserRole);
        setError(null);
      } else {
        console.log('No organization found after retries');
        setOrganization(null);
        setUserRole(null);
      }
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

  useEffect(() => {
    console.log('Organization effect triggered:', {
      userId: user?.id,
      authLoading,
      hasOrg: !!organization,
      orgId: organization?.id,
      isLoading,
      userRole
    });
    fetchUserOrganization();
  }, [user?.id, authLoading]);

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

      // Fetch the newly created organization immediately
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role::text,
          permissions,
          created_at,
          organization:organizations (
            id,
            name,
            slug,
            created_at,
            updated_at,
            branding,
            settings
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData) throw new Error('Organization created but member data not found');

      console.log('Setting newly created organization:', memberData.organization);
      console.log('Setting user role:', memberData.role);
      
      setOrganization(memberData.organization);
      setUserRole(memberData.role as UserRole);
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user already has an organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('User already belongs to an organization');
      }

      const inviteCode = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);

      // Create invite
      const { error: inviteError } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase(),
          role,
          invite_code: inviteCode,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (inviteError) throw inviteError;

      await sendInviteEmail({
        to: email,
        inviteCode,
        organizationName: organization.name,
        inviterName: user.email || 'An administrator',
        role,
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to send invite');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user already has an organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('User already belongs to an organization');
      }

      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organization:organizations (*)')
        .eq('invite_code', inviteCode)
        .single();

      if (inviteError) throw inviteError;
      if (!invite) throw new Error('Invite not found');

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('This invite has expired');
      }

      // Check if user's email matches invite
      if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error('This invite is for a different email address');
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) throw memberError;

      // Delete the invite
      await supabase
        .from('organization_invites')
        .delete()
        .eq('id', invite.id);

      await sendWelcomeEmail({
        to: user.email,
        organizationName: invite.organization.name,
      });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', user.id)
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
