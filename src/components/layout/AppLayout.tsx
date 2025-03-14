'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { authService } from '@/lib/services/auth'
import { useSession } from '@/lib/hooks/useSession'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Settings,
  History,
  Menu,
  X,
  LogOut,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react'
import { PortfolioProvider } from '@/lib/context/PortfolioContext'
import GlobalPortfolioSelector from '@/components/global/GlobalPortfolioSelector'
import AccountMenu from '@/components/global/AccountMenu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet'

const navigation = [
  { name: 'Trades', href: '/trades', icon: History },
  { name: 'Performance', href: '/performance', icon: TrendingUp },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Settings', href: '/settings', icon: Settings }
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  
  // Close mobile sheet when route changes
  useEffect(() => {
    setIsMobileSheetOpen(false)
  }, [pathname])

  // Don't show the layout for auth pages
  if (['/login', '/signup', '/auth/confirm'].includes(pathname)) {
    return <>{children}</>
  }

  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Redirect to login if no user
  if (!user) {
    router.push('/login')
    return null
  }

  // Content of the sidebar - shared between desktop and mobile
  const SidebarContent = ({ isInSheet = false }: { isInSheet?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <span className={cn(
          "text-lg font-semibold transition-opacity duration-200",
          !isSidebarOpen && "md:opacity-0"
        )}>
          Trading Journal
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="md:block hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-6 w-6" />
          ) : (
            <ChevronRight className="h-6 w-6" />
          )}
        </Button>
        {isInSheet ? (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <X className="h-6 w-6" />
            </Button>
          </SheetClose>
        ) : (
          // Desktop close button (not needed, but keeping for consistency)
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileSheetOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Portfolio Selector */}
      {isSidebarOpen && (
        <div className="px-4 py-4 border-b">
          <GlobalPortfolioSelector />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className={cn("h-5 w-5", isSidebarOpen ? "mr-3" : "mx-auto")} />
              <span className={cn(
                "transition-opacity duration-200",
                !isSidebarOpen && "md:hidden"
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Account Menu */}
      <AccountMenu isSidebarOpen={isSidebarOpen} />
    </div>
  )

  return (
    <PortfolioProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden md:block fixed inset-y-0 left-0 z-50 bg-card transition-all duration-200 ease-in-out',
            isSidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          <SidebarContent isInSheet={false} />
        </aside>

        {/* Main content wrapper */}
        <div className={cn(
          'flex-1 transition-all duration-200 ease-in-out',
          isSidebarOpen 
            ? 'md:ml-64' // 16rem for all pages including trades
            : 'md:ml-20'
        )}>
          {/* Mobile header and mobile sidebar */}
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            {/* Mobile header */}
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 md:hidden">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              
              {/* Show portfolio selector on mobile header */}
              <div className="ml-auto">
                <GlobalPortfolioSelector />
              </div>
            </header>

            {/* Mobile sidebar content */}
            <SheetContent side="left" className="p-0 w-64 sm:max-w-xs">
              <SidebarContent isInSheet={true} />
            </SheetContent>
          </Sheet>

          {/* Page content */}
          <main>
            {children}
          </main>
        </div>
      </div>
    </PortfolioProvider>
  )
} 