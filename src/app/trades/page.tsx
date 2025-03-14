'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Button } from '@/components/ui/button'
import TradeList from '@/components/trades/TradeList'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NewTradeModal } from '@/components/trades/NewTradeModal'
import dynamic from 'next/dynamic'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Portfolio } from '@/lib/types/index'
import PortfolioOverview from '@/components/trades/PortfolioOverview'
import { PortfolioDetails } from '@/components/trades/PortfolioDetails'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import TransactionsList from '@/components/trades/TransactionsList'
import { usePortfolio } from '@/lib/context/PortfolioContext'

const TradeDetails = dynamic(() => import('@/components/trades/TradeDetails'))

export default function TradesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const { selectedPortfolio, refreshPortfolios, isLoading: portfolioLoading } = usePortfolio()
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'transactions'>('open')
  const [key, setKey] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createClientComponentClient()

  const handlePortfolioCreated = useCallback(() => {
    refreshPortfolios()
    setKey(prev => prev + 1)
    setRefreshKey(prev => prev + 1)
  }, [refreshPortfolios])

  const handleTransactionAdded = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // Show loading state while user or portfolio data is being fetched
  if (userLoading || portfolioLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // User will always be available here because middleware handles auth
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
        <div className="flex items-center gap-2">
          {selectedPortfolio && (
            <NewTradeModal portfolioId={selectedPortfolio.id} />
          )}
        </div>
      </div>

      {selectedPortfolio && (
        <PortfolioDetails 
          portfolioId={selectedPortfolio.id} 
          key={`details-${refreshKey}`}
        />
      )}

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="open" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger
                value="open"
                onClick={() => setActiveTab('open')}
              >
                Open Trades
              </TabsTrigger>
              <TabsTrigger
                value="closed"
                onClick={() => setActiveTab('closed')}
              >
                Closed Trades
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                onClick={() => setActiveTab('transactions')}
              >
                Transactions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open">
              {selectedPortfolio ? (
                <TradeList
                  key={`open-${key}`}
                  portfolioId={selectedPortfolio.id}
                  status="open"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a portfolio to view trades
                </div>
              )}
            </TabsContent>

            <TabsContent value="closed">
              {selectedPortfolio ? (
                <TradeList
                  key={`closed-${key}`}
                  portfolioId={selectedPortfolio.id}
                  status="closed"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a portfolio to view trades
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions">
              {selectedPortfolio ? (
                <TransactionsList
                  key={`transactions-${key}`}
                  portfolioId={selectedPortfolio.id}
                  currency="PHP"
                  onTransactionAdded={handleTransactionAdded}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a portfolio to view transactions
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}