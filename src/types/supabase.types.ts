import { Database } from './database.types';

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];

export interface OrganizationMemberWithOrg extends Omit<OrganizationMember, 'organization'> {
  organization?: Organization;
}

export interface SupabaseOrganizationResponse {
  data: OrganizationMemberWithOrg | null;
  error: any;
}