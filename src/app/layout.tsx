import { Toaster } from '@/components/ui/toaster'
import { AppLayout } from '@/components/layout/AppLayout'
import '@/styles/globals.css'

export const metadata = {
  title: 'Trading Journal',
  description: 'Track and analyze your trades',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  )
}
