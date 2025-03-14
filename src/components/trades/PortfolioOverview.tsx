'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface PortfolioOverviewProps {
  portfolioId: string
}

interface PortfolioStats {
  availableCash: number
  totalEquity: number
  totalRealizedPnl: number
  profitPercentage: number
  allocation: {
    cash: number
    invested: number
  }
}

export default function PortfolioOverview({ portfolioId }: PortfolioOverviewProps) {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (portfolioId) {
      loadPortfolioStats()
    }
  }, [portfolioId])

  const loadPortfolioStats = async () => {
    try {
      setIsLoading(true)

      // Get portfolio details
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()

      if (portfolioError) throw portfolioError

      // Get open trades to calculate total invested amount
      const { data: openTrades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'open')

      if (tradesError) throw tradesError

      // Get closed trades to calculate realized P&L
      const { data: closedTrades, error: closedTradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'closed')

      if (closedTradesError) throw closedTradesError

      // Calculate total invested amount
      const totalInvested = openTrades?.reduce((sum, trade) => 
        sum + (trade.quantity * trade.entry_price), 0) || 0

      // Calculate total realized P&L from closed trades
      const totalRealizedPnl = closedTrades?.reduce((sum, trade) => {
        console.log(`Closed trade ${trade.symbol}: P&L = ${trade.pnl}`);
        return sum + (Number(trade.pnl) || 0);
      }, 0) || 0;

      // Calculate profit percentage
      const profitPercentage = (totalRealizedPnl / portfolio.initial_balance) * 100;

      // Calculate total market value of open positions
      const totalMarketValue = openTrades?.reduce((sum, trade) => {
        const currentPrice = trade.current_price || trade.entry_price;
        return sum + (trade.quantity * currentPrice);
      }, 0) || 0;

      // Calculate unrealized P&L from open trades
      const unrealizedPnL = openTrades?.reduce((sum, trade) => {
        console.log(`Open trade ${trade.symbol}: P&L = ${trade.pnl}`);
        return sum + (Number(trade.pnl) || 0);
      }, 0) || 0;

      // NEW CALCULATION: Available Cash should include market value of open positions
      const availableCash = portfolio.available_cash + totalMarketValue;
      
      // TOTAL P&L CALCULATION: Sum of all trades' P&L values
      const totalPnL = totalRealizedPnl + unrealizedPnL;
      
      // FINAL EQUITY VALUE: Initial Balance + Total P&L
      const equityValue = portfolio.initial_balance + totalPnL;
      
      // Log the entire portfolio object to debug
      console.log('Portfolio Stats:', {
        initialBalance: portfolio.initial_balance,
        availableCash: portfolio.available_cash,
        totalMarketValue,
        realizedPnL: totalRealizedPnl,
        unrealizedPnL,
        totalPnL,
        equityValue
      });

      setStats({
        availableCash: availableCash,
        totalEquity: equityValue,
        totalRealizedPnl,
        profitPercentage,
        allocation: {
          cash: portfolio.available_cash,
          invested: totalInvested
        }
      })
    } catch (error) {
      console.error('Error loading portfolio stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return <div>Loading portfolio overview...</div>
  }

  const chartData = {
    labels: ['Cash', 'Invested'],
    datasets: [
      {
        data: [stats.allocation.cash, stats.allocation.invested],
        backgroundColor: ['#10b981', '#6366f1'],
        borderColor: ['#059669', '#4f46e5'],
        borderWidth: 1,
      },
    ],
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.availableCash, '₱')}</div>
          <p className="text-xs text-muted-foreground">
            Cash + Market Value of Open Positions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalEquity, '₱')}</div>
          <p className="text-xs text-muted-foreground">
            Initial Balance + Realized P/L + Unrealized P/L
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Realized P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.totalRealizedPnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.totalRealizedPnl, '₱')}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.profitPercentage.toFixed(1)}% return
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[100px]">
            <Pie data={chartData} options={{ maintainAspectRatio: false }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 