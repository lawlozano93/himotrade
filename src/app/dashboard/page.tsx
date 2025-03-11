'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { analyticsService } from '@/lib/services/analyticsService'
import { supabase } from '@/lib/services/supabase'
import Link from 'next/link'

type RecentTrade = {
  id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  quantity: number
  status: 'open' | 'closed'
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0
  })
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([])

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return

      try {
        setLoading(true)

        // Fetch analytics data
        const keyMetrics = await analyticsService.getKeyMetrics(user.id)

        // Fetch recent trades
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        setMetrics({
          totalTrades: trades?.length || 0,
          winRate: keyMetrics.winRate.current,
          totalPnL: keyMetrics.totalPnL.current
        })

        setRecentTrades(trades || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/trades/new">
          <Button>New Trade</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalTrades}</p>
            <p className="text-sm text-muted-foreground">Total trades this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Current win rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${metrics.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">Total profit/loss</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No trades yet.{' '}
              <Link href="/trades/new" className="text-primary hover:underline">
                Add your first trade
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {recentTrades.map(trade => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trade.symbol}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          trade.side === 'long'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          trade.status === 'open'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Entry: ${trade.entry_price} | Quantity: {trade.quantity}
                      {trade.exit_price && ` | Exit: $${trade.exit_price}`}
                    </p>
                  </div>
                  <Link href={`/trades/${trade.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 