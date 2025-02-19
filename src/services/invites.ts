import { supabase } from '../lib/supabase';
import { getEmailService } from './email';
import {
  InviteError,
  InviteErrorCode,
  validateEmail,
  validateRole,
  handleDatabaseError,
  logError
} from '../utils/errorHandling';

export interface InviteResult {
  success: boolean;
  inviteId?: string;
  redirectTo?: string;
  error?: string;
}

async function getOrganizationName(orgId: string): Promise<string> {
  try {
    console.log('Fetching organization name for ID:', orgId);
    const { data, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
    if (!data) {
      console.error('Organization not found');
      throw new Error('Organization not found');
    }
    
    console.log('Found organization name:', data.name);
    return data.name;
  } catch (error) {
    console.error('Error in getOrganizationName:', error);
    handleDatabaseError(error);
  }
}

function generateInviteUrl(inviteId: string): string {
  const baseUrl = window.location.origin;
  const inviteUrl = `${baseUrl}/accept-invite/${inviteId}`;
  console.log('Generated invite URL:', inviteUrl);
  return inviteUrl;
}

export async function createInvite(
  email: string,
  role: string,
  orgId: string,
  isSignupFlow = false
): Promise<InviteResult> {
  console.log('Creating invite:', { email, role, orgId, isSignupFlow });
  
  try {
    // Validate inputs
    validateEmail(email);
    validateRole(role);

    // Get current user first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Error getting current user:', authError);
      throw new InviteError(
        'Failed to get current user',
        InviteErrorCode.AUTH_ERROR
      );
    }

    if (!user) {
      console.error('No current user found');
      throw new InviteError(
        'You must be logged in to send invites',
        InviteErrorCode.AUTH_ERROR
      );
    }

    console.log('Current user:', { userId: user.id });

    // Check if organization exists
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Error checking organization:', orgError);
      handleDatabaseError(orgError);
    }

    if (!orgData) {
      console.error('Organization not found:', orgId);
      throw new InviteError(
        'Organization not found',
        InviteErrorCode.DATABASE_ERROR
      );
    }

    // Verify user is a member of the organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      console.error('Error checking organization membership:', memberError);
      throw new InviteError(
        'Failed to verify organization membership',
        InviteErrorCode.AUTH_ERROR
      );
    }

    if (!memberData) {
      console.error('User is not a member of the organization:', { userId: user.id, orgId });
      throw new InviteError(
        'You must be a member of the organization to send invites',
        InviteErrorCode.AUTH_ERROR
      );
    }

    // Check for existing pending invite
    const { data: existingInvite, error: existingInviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .single();

    if (existingInviteError && existingInviteError.code !== 'PGRST116') {
      console.error('Error checking existing invite:', existingInviteError);
      handleDatabaseError(existingInviteError);
    }

    if (existingInvite) {
      console.error('Duplicate invite found:', existingInvite);
      throw new InviteError(
        'An invite has already been sent to this email',
        InviteErrorCode.DUPLICATE_INVITE
      );
    }

    // Create new invite
    console.log('Creating invite record...', {
      email: email.toLowerCase(),
      organizationId: orgId,
      role,
      invitedBy: user.id
    });

    const { data: inviteData, error: createError } = await supabase
      .from('organization_invites')
      .insert({
        email: email.toLowerCase(),
        organization_id: orgId,
        role,
        status: 'pending',
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating invite:', createError);
      handleDatabaseError(createError);
    }

    if (!inviteData) {
      console.error('No invite data returned after creation');
      throw new InviteError(
        'Failed to create invite',
        InviteErrorCode.DATABASE_ERROR
      );
    }

    console.log('Invite created successfully:', inviteData);

    // Send invite email
    try {
      const inviteUrl = generateInviteUrl(inviteData.id);
      console.log('Starting invite email process:', {
        email,
        organizationName: orgData.name,
        inviteUrl,
        role,
        isDevelopment: import.meta.env.MODE === 'development',
        timestamp: new Date().toISOString()
      });

      // Get email service and verify it's initialized
      const emailService = getEmailService();
      if (!emailService) {
        throw new Error('Email service not initialized');
      }

      console.log('Email service retrieved, sending invite...');
      await emailService.sendInvite({
        email,
        organizationName: orgData.name,
        inviteUrl,
        role,
      });

      console.log('Invite email sent successfully:', {
        inviteId: inviteData.id,
        email,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        inviteId: inviteData.id,
      };

    } catch (emailError) {
      console.error('Failed to send invite email:', {
        error: emailError,
        inviteId: inviteData.id,
        email,
        isDevelopment: import.meta.env.MODE === 'development',
        timestamp: new Date().toISOString()
      });

      logError(emailError, {
        operation: 'sendInviteEmail',
        inviteId: inviteData.id,
        email,
        orgId,
      });
      
      // Update invite status to indicate email failure
      const { error: updateError } = await supabase
        .from('organization_invites')
        .update({ status: 'email_failed' })
        .eq('id', inviteData.id);

      if (updateError) {
        console.error('Failed to update invite status:', updateError);
      }
      
      return {
        success: false,
        inviteId: inviteData.id,
        error: emailError instanceof Error ? emailError.message : 'Failed to send invite email'
      };
    }
  } catch (error) {
    console.error('Error in createInvite:', error);
    logError(error, {
      operation: 'createInvite',
      email,
      orgId,
      isSignupFlow,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function listOrgInvites(orgId: string) {
  try {
    console.log('Listing organization invites for:', orgId);
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing invites:', error);
      handleDatabaseError(error);
    }

    console.log('Found invites:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in listOrgInvites:', error);
    logError(error, {
      operation: 'listOrgInvites',
      orgId,
    });
    throw error;
  }
}

export async function revokeInvite(inviteId: string): Promise<boolean> {
  try {
    console.log('Revoking invite:', inviteId);
    const { error } = await supabase
      .from('organization_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) {
      console.error('Error revoking invite:', error);
      handleDatabaseError(error);
    }

    console.log('Invite revoked successfully');
    return true;
  } catch (error) {
    console.error('Error in revokeInvite:', error);
    logError(error, {
      operation: 'revokeInvite',
      inviteId,
    });
    return false;
  }
}
