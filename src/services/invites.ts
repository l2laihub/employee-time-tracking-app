import { supabase } from '../lib/supabase'

export interface InviteResult {
  success: boolean
  inviteId?: string
  redirectTo?: string
  error?: string
}

export async function createInvite(email: string, role: string, orgId: string, isSignupFlow = false): Promise<InviteResult> {
  try {
    if (isSignupFlow) {
      // First check if there's an existing invite
      const { data: existingInvite, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('email', email)
        .eq('organization_id', orgId)
        .single();

      // For signup flow, we need an existing invite
      if (inviteError || !existingInvite) {
        throw new Error('No active invite found for this email');
      }

      // Create organization membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: '', // Will be populated by auth hook
          organization_id: orgId,
          role
        })
        .select();

      if (memberError) throw memberError;

      return { 
        success: true, 
        inviteId: existingInvite.id,
        redirectTo: `/dashboard/${orgId}`
      };
    } else {
      // Create new invite
      const { data, error } = await supabase
        .from('organization_invites')
        .insert({
          email,
          organization_id: orgId,
          role
        })
        .select();

      if (error) throw error;

      // Get the first invite from the returned array
      const inviteData = data[0];

      return { 
        success: true, 
        inviteId: inviteData.id,
        redirectTo: `/dashboard/${orgId}`
      };
    }
  } catch (error) {
    console.error('Invite creation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

export async function listOrgInvites(orgId: string) {
  const { data, error } = await supabase
    .from('organization_invites')
    .select('*')
    .eq('organization_id', orgId)

  if (error) throw error
  return data
}
