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
      trades: {
        Row: {
          id: string
          created_at: string
          user_id: string
          symbol: string
          entry_price: number
          exit_price: number | null
          quantity: number
          type: 'buy' | 'sell'
          status: 'open' | 'closed'
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          symbol: string
          entry_price: number
          exit_price?: number | null
          quantity: number
          type: 'buy' | 'sell'
          status?: 'open' | 'closed'
          notes?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          symbol?: string
          entry_price?: number
          exit_price?: number | null
          quantity?: number
          type?: 'buy' | 'sell'
          status?: 'open' | 'closed'
          notes?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
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