import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

/**
 * Apply the organization RPC function to the database
 */
async function applyOrganizationRPC() {
  try {
    console.log('Applying organization RPC function...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-organization-rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying organization RPC function:', error);
      
      // Since we can't use the service role client directly in the browser,
      // we'll need to rely on the RPC function to have the proper permissions
      console.log('Please ensure the RPC function has SECURITY DEFINER attribute');
      process.exit(1);
    } else {
      console.log('Organization RPC function applied successfully');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error applying organization RPC function:', error);
    process.exit(1);
  }
}

// Run the migration
applyOrganizationRPC();
