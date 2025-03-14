'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { formatCurrency } from '@/lib/utils'

interface PortfolioMetricsProps {
  portfolioId: string
}

export function PortfolioMetrics({ portfolioId }: PortfolioMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<{
    name: string
    initialBalance: number
    availableCash: number
    currentBalance: number
    realizedPnL: number
    currency: string
    totalTrades: number
    openTrades: number
  } | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()
        
        // Fetch portfolio details
        const { data: portfolio, error: portfolioError } = await supabase
          .from('portfolios')
          .select('*')
          .eq('id', portfolioId)
          .single()
          
        if (portfolioError) throw portfolioError
        
        // Fetch trade counts
        const { data: trades, error: tradesError } = await supabase
          .from('trades')
          .select('id, status')
          .eq('portfolio_id', portfolioId)
          
        if (tradesError) throw tradesError
        
        const totalTrades = trades?.length || 0
        const openTrades = trades?.filter(t => t.status === 'open').length || 0
        
        setMetrics({
          name: portfolio.name,
          initialBalance: portfolio.initial_balance,
          availableCash: portfolio.available_cash,
          currentBalance: portfolio.current_balance,
          realizedPnL: portfolio.realized_pnl,
          currency: portfolio.currency,
          totalTrades,
          openTrades
        })
      } catch (error) {
        console.error('Error fetching portfolio metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (portfolioId) {
      fetchMetrics()
    }
  }, [portfolioId])
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (!metrics) return null
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.availableCash, metrics.currency)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.currentBalance, metrics.currency)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.realizedPnL > 0 ? 'text-green-500' : metrics.realizedPnL < 0 ? 'text-red-500' : ''}`}>
            {formatCurrency(metrics.realizedPnL, metrics.currency)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Open Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.openTrades} / {metrics.totalTrades}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 