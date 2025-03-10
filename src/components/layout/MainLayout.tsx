"use client"

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  LineChart,
  Settings,
  PlusCircle,
  History,
} from 'lucide-react'

interface MainLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: History },
  { name: 'New Trade', href: '/trades/new', icon: PlusCircle },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
        <div className="flex h-16 items-center px-6 border-b border-[hsl(var(--border))]">
          <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Trading Journal</h1>
        </div>
        <nav className="space-y-1.5 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'nav-link',
                  isActive && 'active'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="main-container">
          {children}
        </main>
      </div>
    </div>
  )
} 