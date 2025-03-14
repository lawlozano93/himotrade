import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define routes that don't require authentication
const PUBLIC_PATHS = [
  '/signup',
  '/auth/callback',
  '/_next',
  '/static',
  '/api/auth',
  '/favicon.ico',
  '/images',
  '/fonts'
]

// Define auth routes (routes that should redirect to /trades if user is authenticated)
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname
    
    // Skip middleware for public static files
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
      return NextResponse.next()
    }

    // Create a response to modify
    const res = NextResponse.next()

    // Create the Supabase client
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired - this will update the session cookie if needed
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    // Handle session errors
    if (sessionError) {
      console.error('Session error:', sessionError)
      return handleAuthRedirect(request, path)
    }

    // Determine route type
    const isAuthRoute = AUTH_ROUTES.includes(path)
    const isProtectedRoute = !isAuthRoute && !PUBLIC_PATHS.some(p => path.startsWith(p))

    // Handle auth routes (login, signup)
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/trades', request.url))
    }

    // Handle protected routes
    if (isProtectedRoute && !session) {
      return handleAuthRedirect(request, path)
    }

    // Add user context to request headers for server components
    if (session) {
      res.headers.set('x-user-id', session.user.id)
      res.headers.set('x-user-email', session.user.email || '')
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return handleAuthRedirect(request)
  }
}

function handleAuthRedirect(request: NextRequest, from?: string) {
  const redirectUrl = new URL('/login', request.url)
  if (from && !AUTH_ROUTES.includes(from)) {
    redirectUrl.searchParams.set('from', from)
  }
  return NextResponse.redirect(redirectUrl)
}

// Only run middleware on routes that need session checking
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 