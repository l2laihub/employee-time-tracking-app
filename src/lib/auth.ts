import { supabase } from './supabase';
import toast from 'react-hot-toast';

export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('User data error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export interface InviteValidationResult {
  valid: boolean
  orgId?: string
  error?: string
}

export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_invite_token', {
      token
    })

    if (error) {
      return { valid: false, error: error.message }
    }

    return { 
      valid: true,
      orgId: data?.organization_id
    }
  } catch (error) {
    console.error('Invite validation error:', error)
    return { valid: false, error: 'Failed to validate invitation' }
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error('Sign in error:', error);
    toast.error('Invalid email or password');
    throw error;
  }
}
