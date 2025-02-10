import { UserRole } from './custom.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          settings: Json
          branding: {
            primary_color: string
            secondary_color: string
            logo_url: string | null
            favicon_url: string | null
            company_name: string | null
            company_website: string | null
          }
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          settings?: Json
          branding?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          settings?: Json
          branding?: Json
        }
      }
      organization_members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          organization_id: string
          user_id: string
          role: string
          permissions: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          organization_id: string
          user_id: string
          role?: string
          permissions?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          organization_id?: string
          user_id?: string
          role?: string
          permissions?: Json
        }
      }
      organization_invites: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: UserRole
          invite_code: string
          created_at: string
          expires_at: string
          status: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: UserRole
          invite_code?: string
          created_at?: string
          expires_at?: string
          status?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: UserRole
          invite_code?: string
          created_at?: string
          expires_at?: string
          status?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          department: string | null
          position: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          department?: string | null
          position?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          department?: string | null
          position?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_locations: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          service_type: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          service_type: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          service_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          organization_id: string
          employee_id: string
          job_location_id: string
          entry_date: string
          start_time: string
          end_time: string
          break_duration: number
          work_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          employee_id: string
          job_location_id: string
          entry_date: string
          start_time: string
          end_time: string
          break_duration: number
          work_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          employee_id?: string
          job_location_id?: string
          entry_date?: string
          start_time?: string
          end_time?: string
          break_duration?: number
          work_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      timesheets: {
        Row: {
          id: string
          organization_id: string
          employee_id: string
          period_start_date: string
          period_end_date: string
          status: string
          total_hours: number
          submitted_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          employee_id: string
          period_start_date: string
          period_end_date: string
          status?: string
          total_hours?: number
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          employee_id?: string
          period_start_date?: string
          period_end_date?: string
          status?: string
          total_hours?: number
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pto_requests: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          start_date: string
          end_date: string
          type: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          start_date: string
          end_date: string
          type: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          type?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          organization_id: string
          name: string
          key_hash: string
          scope: string[]
          last_used_at: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          key_hash: string
          scope?: string[]
          last_used_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          key_hash?: string
          scope?: string[]
          last_used_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
      }
      organization_metrics: {
        Row: {
          id: string
          organization_id: string
          active_users: number
          time_entries: number
          storage_used: number
          api_calls: number
          timestamp: string
        }
        Insert: {
          id?: string
          organization_id: string
          active_users?: number
          time_entries?: number
          storage_used?: number
          api_calls?: number
          timestamp?: string
        }
        Update: {
          id?: string
          organization_id?: string
          active_users?: number
          time_entries?: number
          storage_used?: number
          api_calls?: number
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'member'
    }
  }
}
