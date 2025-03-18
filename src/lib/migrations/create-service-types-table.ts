import { supabase } from '../supabase';

export async function createServiceTypesTable() {
  try {
    // First, try to directly query the service_types table
    try {
      const { error: queryError } = await supabase
        .from('service_types')
        .select('*', { count: 'exact', head: true });
      
      if (!queryError) {
        console.log('service_types table exists, skipping creation');
        return { success: true };
      }
    } catch {
      // If direct query fails, continue with creation
      console.log('Could not verify if service_types exists via direct query');
    }

    // Create the service_types table
    const { error: createError } = await supabase.rpc('create_service_types_table');

    if (createError) {
      console.error('Error creating service_types table:', createError);
      return { success: false, error: createError };
    }

    // Seed with default service types
    const { error: seedError } = await supabase
      .from('service_types')
      .insert([
        { name: 'HVAC' },
        { name: 'Plumbing' },
        { name: 'Both' }
      ]);

    if (seedError) {
      console.error('Error seeding service_types:', seedError);
      return { success: false, error: seedError };
    }

    console.log('Successfully created and seeded service_types table');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error creating service_types table:', error);
    return { success: false, error };
  }
}

// SQL function to create the table (to be executed via RPC)
/*
CREATE OR REPLACE FUNCTION create_service_types_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Add RLS policies
  ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
  
  -- Policy for select (read) - allow authenticated users to read all service types
  CREATE POLICY "Allow authenticated users to read service types"
    ON public.service_types
    FOR SELECT
    USING (auth.role() = 'authenticated');
  
  -- Policy for insert - only allow admins to insert
  CREATE POLICY "Allow admins to insert service types"
    ON public.service_types
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
      )
    );
  
  -- Policy for update - only allow admins to update
  CREATE POLICY "Allow admins to update service types"
    ON public.service_types
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
      )
    );
  
  -- Policy for delete - only allow admins to delete
  CREATE POLICY "Allow admins to delete service types"
    ON public.service_types
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
      )
    );
END;
$$;
*/
