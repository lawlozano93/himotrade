'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useUser } from '@/lib/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { usePortfolio } from '@/lib/context/PortfolioContext'

interface Trade {
  id: string
  user_id: string
  portfolio_id: string
  symbol: string
  entry_date: string
  entry_price: number
  exit_price?: number
  quantity: number
  pnl: number
  strategy: string | null
  status: 'open' | 'closed'
}

interface AnalyticsData {
  winRate: number
  profitFactor: number
  averageRR: number
  totalPnL: number
  strategyPerformance: {
    strategy: string
    winRate: number
    pnl: number
    trades: number
  }[]
  monthlyPerformance: {
    month: string
    pnl: number
  }[]
}

interface StrategyStats {
  wins: number
  trades: number
  pnl: number
}

export default function AnalyticsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const { selectedPortfolio, isLoading: portfolioLoading } = usePortfolio()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user?.id && selectedPortfolio) {
      loadAnalyticsData()
    }
  }, [user?.id, selectedPortfolio?.id])

  const loadAnalyticsData = async () => {
    if (!selectedPortfolio || !user?.id) return;
    
    try {
      setIsLoading(true)
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id)
        .eq('status', 'closed')

      if (error) throw error

      const typedTrades = trades as Trade[]

      // Calculate analytics metrics
      const totalTrades = typedTrades.length
      const winningTrades = typedTrades.filter(trade => trade.pnl > 0)
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
      
      const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const losingTrades = typedTrades.filter(trade => trade.pnl <= 0)
      const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0))
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0
      
      const totalPnL = typedTrades.reduce((sum, trade) => sum + trade.pnl, 0)

      // First get strategies from this specific portfolio
      const { data: portfolioStrategies, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id);
      
      if (strategiesError) throw strategiesError;
      
      // Create map for quick lookup
      const strategiesMap = portfolioStrategies.reduce((acc, strategy) => {
        acc[strategy.id] = strategy.name;
        return acc;
      }, {} as Record<string, string>);

      // Group trades by strategy
      const strategyMap = typedTrades.reduce((acc, trade) => {
        // Use either the strategy name from our map or 'Unknown'
        const strategyName = trade.strategy ? (strategiesMap[trade.strategy] || 'Unknown') : 'Unknown';
        
        if (!acc[strategyName]) {
          acc[strategyName] = {
            wins: 0,
            trades: 0,
            pnl: 0
          }
        }
        acc[strategyName].trades++
        acc[strategyName].pnl += trade.pnl
        if (trade.pnl > 0) acc[strategyName].wins++
        return acc
      }, {} as Record<string, StrategyStats>)

      const strategyPerformance = Object.entries(strategyMap).map(([strategy, stats]) => ({
        strategy,
        winRate: (stats.wins / stats.trades) * 100,
        pnl: stats.pnl,
        trades: stats.trades
      }))

      // Group trades by month
      const monthlyMap = typedTrades.reduce((acc, trade) => {
        const month = new Date(trade.entry_date).toLocaleString('default', { month: 'long', year: 'numeric' })
        if (!acc[month]) {
          acc[month] = 0
        }
        acc[month] += trade.pnl
        return acc
      }, {} as Record<string, number>)

      const monthlyPerformance = Object.entries(monthlyMap).map(([month, pnl]) => ({
        month,
        pnl
      }))

      setData({
        winRate,
        profitFactor,
        averageRR: 0, // TODO: Calculate R:R
        totalPnL,
        strategyPerformance,
        monthlyPerformance
      })
    } catch (error) {
      console.error('Error loading analytics data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || portfolioLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!selectedPortfolio) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-2">No Portfolio Selected</h2>
          <p className="text-muted-foreground">
            Please select a portfolio to view analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze your trading performance and patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.winRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.profitFactor.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average R:R</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.averageRR.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{data?.totalPnL.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.strategyPerformance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No strategy data available</p>
            ) : (
              <div className="space-y-4">
                {data?.strategyPerformance.map((strategy) => (
                  <div key={strategy.strategy} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{strategy.strategy}</div>
                      <div className="text-sm text-muted-foreground">
                        {strategy.trades} trades, {strategy.winRate.toFixed(1)}% win rate
                      </div>
                    </div>
                    <div className={strategy.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₱{strategy.pnl.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.monthlyPerformance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No monthly data available</p>
            ) : (
              <div className="space-y-4">
                {data?.monthlyPerformance.map((month) => (
                  <div key={month.month} className="flex justify-between items-center">
                    <div className="font-medium">{month.month}</div>
                    <div className={month.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₱{month.pnl.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 