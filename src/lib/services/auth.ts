import { supabase } from '../supabase/client'
import type { User, AuthError } from '@supabase/supabase-js'

export class AuthenticationError extends Error {
  constructor(message: string, public originalError: AuthError) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export const authService = {
  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw new AuthenticationError('Failed to get current user', error)
      return user
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      return null
    }
  },
  
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw new AuthenticationError('Failed to sign in', error)

      return {
        user: data.user,
        session: data.session
      }
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new Error('An unexpected error occurred during sign in')
    }
  },
  
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw new AuthenticationError('Failed to sign up', error)

      return data
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new Error('An unexpected error occurred during sign up')
    }
  },
  
  /**
   * Sign out the current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw new AuthenticationError('Failed to sign out', error)
      return { success: true }
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new Error('An unexpected error occurred during sign out')
    }
  },
  
  /**
   * Get the current session
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw new AuthenticationError('Failed to get session', error)
      return session
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new Error('An unexpected error occurred while getting session')
    }
  }
} 