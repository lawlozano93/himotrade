import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Try to get user by email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers({
      search: email
    })

    if (getUserError) {
      return NextResponse.json({ error: 'Error checking user', details: getUserError.message }, { status: 500 })
    }

    const user = users?.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is confirmed
    const userDetails = {
      email: user.email,
      emailConfirmed: user.email_confirmed_at !== null,
      lastSignIn: user.last_sign_in_at,
      createdAt: user.created_at
    }

    return NextResponse.json({ user: userDetails })
  } catch (error: any) {
    return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 })
  }
} 