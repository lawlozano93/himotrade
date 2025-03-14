import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export interface SessionState {
  user: User | null
  loading: boolean
  initialized: boolean
}

export function useSession() {
  const router = useRouter()
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
    initialized: false
  })

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
        const session = await authService.getSession()
        
        if (!mounted) return

        if (session?.user) {
          setState({
            user: session.user,
            loading: false,
            initialized: true
          })
        } else {
          setState({
            user: null,
            loading: false,
            initialized: true
          })
          router.push('/login')
        }
      } catch (error) {
        console.error('Error initializing session:', error)
        if (mounted) {
          setState({
            user: null,
            loading: false,
            initialized: true
          })
          router.push('/login')
        }
      }
    }

    initializeSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            loading: false,
            initialized: true
          })
          router.push('/login')
        } else if (session?.user) {
          setState({
            user: session.user,
            loading: false,
            initialized: true
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return state
} 