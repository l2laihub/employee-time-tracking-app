import { supabase } from '../../lib/supabase';
import fs from 'fs';
import path from 'path';

/**
 * Apply RPC functions for organization-related operations
 * This creates stored procedures that bypass RLS for creating departments and service types
 */
export const applyRpcFunctions = async () => {
  try {
    console.log('Applying RPC functions for organization operations...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-rpc-functions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying RPC functions:', error);
      return { success: false, error };
    }
    
    console.log('RPC functions applied successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in applyRpcFunctions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// For manual execution if needed
if (require.main === module) {
  applyRpcFunctions()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}
