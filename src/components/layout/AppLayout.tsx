'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/services/supabase'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Settings,
  PlusCircle,
  History,
  Menu,
  X,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Trades', href: '/trades', icon: History },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Settings', href: '/settings', icon: Settings }
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && !['/login', '/signup'].includes(pathname)) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/trades')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  if (loading) {
    return <div>Loading...</div>
  }

  if (['/login', '/signup'].includes(pathname)) {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/trades" className="text-xl font-bold">
            HimoTrades
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 mt-4 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </nav>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isSidebarOpen ? "lg:pl-64" : "pl-0"
        )}
      >
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <main className="container py-8">{children}</main>
      </div>
    </div>
  )
} 