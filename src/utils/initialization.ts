import { initializeDefaultDepartments } from '../services/departments';
import { supabase } from '../lib/supabase';

/**
 * Initialize application data
 * This function should be called during app initialization
 */
export async function initializeAppData(): Promise<void> {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      console.log('User not authenticated, skipping initialization');
      return;
    }
    
    // Get user's organization
    const { data: userOrg } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();
      
    if (!userOrg?.organization_id) {
      console.log('User has no organization, skipping initialization');
      return;
    }
    
    // Initialize default departments for the organization if none exist
    await initializeDefaultDepartments(userOrg.organization_id);
    
    // Add other initialization functions here as needed
  } catch (error) {
    console.error('Error initializing application data:', error);
  }
}
