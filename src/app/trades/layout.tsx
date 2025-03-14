import { headers } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function TradesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')

  // If no user ID in headers, user is not authenticated
  if (!userId) {
    redirect('/login')
  }

  return children
} 