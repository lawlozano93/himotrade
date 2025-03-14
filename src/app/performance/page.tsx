'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useUser } from '@/lib/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePortfolio } from '@/lib/context/PortfolioContext'

interface PerformanceMetrics {
  totalTrades: number
  winRate: number
  profitFactor: number
  averageRR: number
  netPnL: number
  maxDrawdown: number
}

export default function PerformancePage() {
  const { user } = useUser()
  const { toast } = useToast()
  const { selectedPortfolio, isLoading: portfolioLoading } = usePortfolio()
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('1M')
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user?.id && selectedPortfolio) {
      loadPerformanceData()
    }
  }, [user?.id, selectedPortfolio?.id, timeframe])

  const loadPerformanceData = async () => {
    if (!selectedPortfolio || !user?.id) return;
    
    try {
      setIsLoading(true)
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id)
        .eq('status', 'closed')

      if (error) throw error

      // Calculate performance metrics
      const totalTrades = trades.length
      const winningTrades = trades.filter(trade => trade.pnl > 0)
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
      
      const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const losingTrades = trades.filter(trade => trade.pnl <= 0)
      const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0))
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0
      
      const netPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0)
      
      // Calculate running balance for drawdown
      let peak = 0
      let maxDrawdown = 0
      let runningBalance = 0
      
      trades.forEach(trade => {
        runningBalance += trade.pnl
        if (runningBalance > peak) {
          peak = runningBalance
        }
        const drawdown = ((peak - runningBalance) / peak) * 100
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      })

      setMetrics({
        totalTrades,
        winRate,
        profitFactor,
        averageRR: 0, // TODO: Calculate R:R
        netPnL,
        maxDrawdown
      })
    } catch (error) {
      console.error('Error loading performance data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load performance data',
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
            Please select a portfolio to view performance metrics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1M">1 Month</SelectItem>
            <SelectItem value="3M">3 Months</SelectItem>
            <SelectItem value="6M">6 Months</SelectItem>
            <SelectItem value="1Y">1 Year</SelectItem>
            <SelectItem value="ALL">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalTrades || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.winRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.profitFactor.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{metrics?.netPnL.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average R:R</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageRR.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.maxDrawdown.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Performance charts coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}