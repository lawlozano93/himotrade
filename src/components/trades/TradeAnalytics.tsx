'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trade, TradeHistoryAction } from '@/lib/types'

interface TradeAnalyticsProps {
  portfolioId: string
}

interface TradeStats {
  totalTrades: number
  netPL: number
  accuracy: number
  avgWin: number
  avgLoss: number
  avgTradeLength: number
  edgeRatio: number
  maxDrawdown: number
  recoveryFactor: number
  profitFactor: number
}

export default function TradeAnalytics({ portfolioId }: TradeAnalyticsProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<TradeStats>({
    totalTrades: 0,
    netPL: 0,
    accuracy: 0,
    avgWin: 0,
    avgLoss: 0,
    avgTradeLength: 0,
    edgeRatio: 0,
    maxDrawdown: 0,
    recoveryFactor: 0,
    profitFactor: 0
  })
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryAction[]>([])
  const [topGainers, setTopGainers] = useState<Trade[]>([])
  const [topLosers, setTopLosers] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (portfolioId) {
      loadTradeAnalytics()
    }
  }, [portfolioId])

  const loadTradeAnalytics = async () => {
    try {
      setIsLoading(true)

      // Load trade history
      const { data: historyData, error: historyError } = await supabase
        .from('trade_history')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyError) throw historyError
      setTradeHistory(historyData)

      // Load trade statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('calculate_trade_statistics', { p_portfolio_id: portfolioId })

      if (statsError) throw statsError
      if (statsData && statsData.length > 0) {
        setStats({
          totalTrades: statsData[0].total_trades || 0,
          netPL: statsData[0].net_pl || 0,
          accuracy: statsData[0].accuracy || 0,
          avgWin: statsData[0].avg_win || 0,
          avgLoss: statsData[0].avg_loss || 0,
          avgTradeLength: statsData[0].avg_trade_length || 0,
          edgeRatio: statsData[0].edge_ratio || 0,
          maxDrawdown: statsData[0].max_drawdown || 0,
          recoveryFactor: statsData[0].recovery_factor || 0,
          profitFactor: statsData[0].profit_factor || 0
        })
      }

      // Load top gainers and losers
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_closed', true)
        .order('profit_loss', { ascending: false })
        .limit(5)

      if (tradesError) throw tradesError
      if (tradesData) {
        setTopGainers(tradesData.slice(0, 5))
        setTopLosers([...tradesData].sort((a, b) => a.profit_loss - b.profit_loss).slice(0, 5))
      }
    } catch (error) {
      console.error('Error loading trade analytics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load trade analytics',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading analytics...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Overview of Trade Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades Taken</p>
              <p className="text-2xl font-bold">{stats.totalTrades}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net P/L</p>
              <p className="text-2xl font-bold">₱{stats.netPL.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy (%)</p>
              <p className="text-2xl font-bold">{stats.accuracy.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Edge Ratio</p>
              <p className="text-2xl font-bold">{stats.edgeRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Drawdown</p>
              <p className="text-2xl font-bold">{stats.maxDrawdown.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Win (%)</p>
              <p className="text-2xl font-bold">{stats.avgWin.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Loss (%)</p>
              <p className="text-2xl font-bold">{stats.avgLoss.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recovery Factor</p>
              <p className="text-2xl font-bold">{stats.recoveryFactor.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Trade Length</p>
              <p className="text-2xl font-bold">{stats.avgTradeLength.toFixed(2)} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className="text-2xl font-bold">{stats.profitFactor.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {stats.totalTrades === 0 ? (
                <p className="text-muted-foreground">No data to display</p>
              ) : (
                <p>Strategy performance chart will be implemented here</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Gainers</CardTitle>
          </CardHeader>
          <CardContent>
            {topGainers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No data to display</p>
            ) : (
              <div className="space-y-2">
                {topGainers.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center">
                    <span>{trade.symbol}</span>
                    <span className="text-green-500">+₱{trade.profit_loss.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Losers</CardTitle>
          </CardHeader>
          <CardContent>
            {topLosers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No data to display</p>
            ) : (
              <div className="space-y-2">
                {topLosers.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center">
                    <span>{trade.symbol}</span>
                    <span className="text-red-500">-₱{Math.abs(trade.profit_loss).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          {tradeHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No trade history available</p>
          ) : (
            <div className="space-y-4">
              {tradeHistory.map((action) => (
                <div key={action.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{action.action_type}</p>
                    <p className="text-sm text-muted-foreground">{action.details}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(action.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 