import { supabase } from '../lib/supabase';

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceTypeResult {
  success: boolean;
  data?: ServiceType[];
  error?: string;
}

/**
 * Fetch all service types from the database
 */
export async function listServiceTypes(): Promise<ServiceTypeResult> {
  try {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data as ServiceType[]
    };
  } catch (error) {
    console.error('Error in listServiceTypes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get a service type by ID
 */
export async function getServiceTypeById(id: string): Promise<ServiceType | null> {
  try {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return data as ServiceType;
  } catch (error) {
    console.error('Error in getServiceTypeById:', error);
    return null;
  }
}
