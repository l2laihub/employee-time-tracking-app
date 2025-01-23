import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Organization-aware client wrapper
export class OrganizationClient {
  private client: SupabaseClient<Database>;
  private organizationId: string;

  constructor(organizationId: string) {
    this.client = supabase;
    this.organizationId = organizationId;
  }

  // Helper to automatically inject organization_id in queries
  from<T extends keyof Database['public']['Tables']>(table: T) {
    return this.client
      .from(table)
      .select()
      .eq('organization_id', this.organizationId);
  }

  // Insert with automatic organization_id
  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: Omit<Database['public']['Tables'][T]['Insert'], 'organization_id'>
  ) {
    return this.client.from(table).insert({
      ...data,
      organization_id: this.organizationId,
    });
  }

  // Update with organization_id check
  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string,
    data: Partial<Database['public']['Tables'][T]['Update']>
  ) {
    return this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('organization_id', this.organizationId);
  }

  // Delete with organization_id check
  async delete<T extends keyof Database['public']['Tables']>(table: T, id: string) {
    return this.client
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId);
  }

  // Organization-specific real-time subscriptions
  subscribe<T extends keyof Database['public']['Tables']>(
    table: T,
    callback: (payload: any) => void
  ) {
    return this.client
      .channel(`org_${this.organizationId}_${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `organization_id=eq.${this.organizationId}`,
        },
        callback
      )
      .subscribe();
  }
}