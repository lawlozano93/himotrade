import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Client for use in components
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Get a singleton instance for use in services
export const supabase = createClient()

// Export type helper
export type SupabaseClient = ReturnType<typeof createClient> 