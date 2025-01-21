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
      profiles: {
        Row: {
          id: string
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
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          department?: string | null
          position?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string | null
          break_duration: number
          job_location_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time: string
          end_time?: string | null
          break_duration?: number
          job_location_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          break_duration?: number
          job_location_id?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      job_locations: {
        Row: {
          id: string
          name: string
          address: string | null
          latitude: number | null
          longitude: number | null
          radius: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          radius?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          radius?: number | null
          created_at?: string
        }
      }
      pto_requests: {
        Row: {
          id: string
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
          user_id?: string
          start_date?: string
          end_date?: string
          type?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          period_start: string
          period_end: string
          status: string
          total_hours: number | null
          created_at: string
          submitted_at: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          period_start: string
          period_end: string
          status?: string
          total_hours?: number | null
          created_at?: string
          submitted_at?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string
          period_end?: string
          status?: string
          total_hours?: number | null
          created_at?: string
          submitted_at?: string | null
          approved_at?: string | null
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
      [_ in never]: never
    }
  }
}
