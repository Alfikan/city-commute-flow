import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      routes: {
        Row: {
          id: string
          route_number: string
          route_name: string
          description: string | null
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          route_number: string
          route_name: string
          description?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          route_number?: string
          route_name?: string
          description?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bus_stops: {
        Row: {
          id: string
          stop_code: string
          stop_name: string
          latitude: number
          longitude: number
          address: string | null
          amenities: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stop_code: string
          stop_name: string
          latitude: number
          longitude: number
          address?: string | null
          amenities?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stop_code?: string
          stop_name?: string
          latitude?: number
          longitude?: number
          address?: string | null
          amenities?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      buses: {
        Row: {
          id: string
          bus_number: string
          license_plate: string | null
          route_id: string | null
          capacity: number
          current_latitude: number | null
          current_longitude: number | null
          status: 'active' | 'inactive' | 'maintenance' | 'delayed'
          speed: number
          heading: number
          last_updated: string
          driver_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bus_number: string
          license_plate?: string | null
          route_id?: string | null
          capacity?: number
          current_latitude?: number | null
          current_longitude?: number | null
          status?: 'active' | 'inactive' | 'maintenance' | 'delayed'
          speed?: number
          heading?: number
          last_updated?: string
          driver_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bus_number?: string
          license_plate?: string | null
          route_id?: string | null
          capacity?: number
          current_latitude?: number | null
          current_longitude?: number | null
          status?: 'active' | 'inactive' | 'maintenance' | 'delayed'
          speed?: number
          heading?: number
          last_updated?: string
          driver_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bus_positions: {
        Row: {
          id: string
          bus_id: string
          route_id: string | null
          current_latitude: number
          current_longitude: number
          next_stop_id: string | null
          speed: number
          heading: number
          passenger_count: number
          crowd_level: 'low' | 'medium' | 'high'
          eta_next_stop: number | null
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          bus_id: string
          route_id?: string | null
          current_latitude: number
          current_longitude: number
          next_stop_id?: string | null
          speed?: number
          heading?: number
          passenger_count?: number
          crowd_level?: 'low' | 'medium' | 'high'
          eta_next_stop?: number | null
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          bus_id?: string
          route_id?: string | null
          current_latitude?: number
          current_longitude?: number
          next_stop_id?: string | null
          speed?: number
          heading?: number
          passenger_count?: number
          crowd_level?: 'low' | 'medium' | 'high'
          eta_next_stop?: number | null
          last_updated?: string
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          alert_type: 'delay' | 'breakdown' | 'maintenance' | 'route_change' | 'weather'
          severity: number
          title: string
          message: string
          route_id: string | null
          bus_id: string | null
          stop_id: string | null
          is_active: boolean
          auto_resolve: boolean
          created_at: string
          resolved_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          alert_type: 'delay' | 'breakdown' | 'maintenance' | 'route_change' | 'weather'
          severity?: number
          title: string
          message: string
          route_id?: string | null
          bus_id?: string | null
          stop_id?: string | null
          is_active?: boolean
          auto_resolve?: boolean
          created_at?: string
          resolved_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          alert_type?: 'delay' | 'breakdown' | 'maintenance' | 'route_change' | 'weather'
          severity?: number
          title?: string
          message?: string
          route_id?: string | null
          bus_id?: string | null
          stop_id?: string | null
          is_active?: boolean
          auto_resolve?: boolean
          created_at?: string
          resolved_at?: string | null
          created_by?: string | null
        }
      }
    }
  }
}