'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Label, Pie, PieChart, Tooltip, Cell } from "recharts"

// Define chart config type
interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

// Define chart container props
interface ChartContainerProps {
  config: ChartConfig;
  children: React.ReactNode;
  className?: string;
}

// Simple chart container component
function ChartContainer({ config, children, className }: ChartContainerProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Custom tooltip content
function ChartTooltipContent({ active, payload, hideLabel = false }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold">{data.name}</span>
        <span className="text-xs">{formatCurrency(data.value, 'PHP')}</span>
      </div>
    </div>
  );
}

interface PortfolioDetailsProps {
  portfolioId: string
}

interface PortfolioDetailsData {
  name: string
  currency: string
  dateStarted: string
  lastUpdated: string
  availableCash: number
  equityValue: number
  realizedPnL: number
  totalDeposits: number
  totalWithdrawals: number
  investedAmount: number
  unrealizedPnL: number
  openTrades: {
    symbol: string
    value: number
    fill: string
  }[]
}

// Define chart colors
const chartColors = [
  'hsl(142.1, 76.2%, 36.3%)', // Cash (green)
  'hsl(221.2, 83.2%, 53.3%)', // First stock (blue)
  'hsl(262.1, 83.3%, 57.8%)', // Second stock (purple)
  'hsl(346.8, 77.2%, 49.8%)', // Third stock (red)
  'hsl(43.3, 96.4%, 56.3%)',  // Fourth stock (yellow)
  'hsl(24.6, 95%, 53.1%)',    // Fifth stock (orange)
  'hsl(198, 93.2%, 59.6%)',   // Sixth stock (cyan)
  'hsl(292.1, 91.4%, 72.5%)', // Seventh stock (pink)
  'hsl(215.4, 16.3%, 46.9%)'  // Other stocks (gray)
]

export function PortfolioDetails({ portfolioId }: PortfolioDetailsProps) {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<PortfolioDetailsData | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (portfolioId) {
      loadPortfolioDetails()
    }
  }, [portfolioId])

  const loadPortfolioDetails = async () => {
    try {
      setLoading(true)

      // Get portfolio details
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()

      if (portfolioError) throw portfolioError

      // Get open trades with all details including fees
      const { data: openTrades, error: tradesError } = await supabase
        .from('trades')
        .select('*, total_fee, entry_fee')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'open')

      if (tradesError) throw tradesError

      // Calculate total invested amount INCLUDING fees
      const totalInvested = openTrades?.reduce((sum, trade) => {
        // Base investment (quantity * entry_price)
        const baseInvestment = trade.quantity * trade.entry_price;
        
        // Add entry fee if available, or estimate if not
        const entryFee = trade.entry_fee || (baseInvestment * 0.015); // 1.5% fee estimate if not provided
        
        return sum + baseInvestment + entryFee;
      }, 0) || 0;

      // Calculate total market value (quantity * current_price)
      const totalMarketValue = openTrades?.reduce((sum, trade) => {
        // Use current_price if available, otherwise fall back to entry_price
        const currentPrice = trade.current_price || trade.entry_price;
        return sum + (trade.quantity * currentPrice);
      }, 0) || 0;

      // Get the database values
      const dbAvailableCash = portfolio.available_cash;
      
      // NEW CALCULATION: Available Cash should include market value of open positions
      const availableCash = dbAvailableCash + totalMarketValue;
      
      // Get all closed trades to calculate realized P&L
      const { data: closedTrades, error: closedTradesError } = await supabase
        .from('trades')
        .select('*, pnl')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'closed')

      if (closedTradesError) throw closedTradesError
      
      // Calculate realized P&L directly from closed trades data
      const realizedPnL = closedTrades?.reduce((sum, trade) => {
        console.log(`Closed trade ${trade.symbol}: P&L = ${trade.pnl}`);
        return sum + (Number(trade.pnl) || 0);
      }, 0) || 0;

      // Calculate unrealized P&L directly from open trades data
      const unrealizedPnL = openTrades?.reduce((sum, trade) => {
        console.log(`Open trade ${trade.symbol}: P&L = ${trade.pnl}`);
        return sum + (Number(trade.pnl) || 0);
      }, 0) || 0;

      // TOTAL P&L CALCULATION: Sum of all trades' P&L values
      const totalPnL = realizedPnL + unrealizedPnL;
      
      // FINAL EQUITY VALUE: Initial Balance + Total P&L
      const equityValue = portfolio.initial_balance + totalPnL;
      
      // Log all trades for debugging
      console.log('Open Trades:', openTrades);
      console.log('Closed Trades:', closedTrades);
      
      // Log detailed values for debugging
      console.log('Portfolio Calculations:', {
        initialBalance: portfolio.initial_balance,
        dbAvailableCash,
        availableCash,
        totalInvested,
        totalMarketValue,
        realizedPnL,
        unrealizedPnL,
        totalPnL,
        equityValue,
        portfolioData: portfolio
      });

      // Group open trades by symbol for the pie chart
      const tradesBySymbol = openTrades?.reduce((acc, trade) => {
        // Use current_price if available, otherwise fall back to entry_price
        const currentPrice = trade.current_price || trade.entry_price;
        const marketValue = trade.quantity * currentPrice;
        
        if (!acc[trade.symbol]) {
          acc[trade.symbol] = marketValue;
        } else {
          acc[trade.symbol] += marketValue;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Convert to array format for the chart
      const openTradesForChart = Object.entries(tradesBySymbol).map(([symbol, value], index) => ({
        symbol,
        value: value as number,
        fill: chartColors[index + 1] || chartColors[chartColors.length - 1] // +1 because index 0 is for cash
      }));

      // Add cash as a segment
      openTradesForChart.unshift({
        symbol: 'Cash',
        value: availableCash,
        fill: chartColors[0]
      });

      setDetails({
        name: portfolio.name,
        currency: portfolio.currency || 'PHP',
        dateStarted: portfolio.created_at,
        lastUpdated: portfolio.updated_at,
        availableCash: availableCash,
        equityValue: equityValue,
        realizedPnL: realizedPnL,
        totalDeposits: portfolio.total_deposits || 0,
        totalWithdrawals: portfolio.total_withdrawals || 0,
        investedAmount: totalInvested,
        unrealizedPnL: unrealizedPnL,
        openTrades: openTradesForChart
      })
    } catch (error) {
      console.error('Error loading portfolio details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create chart config dynamically based on open trades
  const chartConfig = useMemo(() => {
    if (!details) return {} as ChartConfig;
    
    const config: ChartConfig = {
      value: {
        label: 'Value',
      },
      Cash: {
        label: 'Cash',
        color: chartColors[0],
      }
    };
    
    // Add each symbol to the config
    details.openTrades.forEach((trade, index) => {
      if (trade.symbol !== 'Cash') {
        config[trade.symbol] = {
          label: trade.symbol,
          color: trade.fill,
        };
      }
    });
    
    return config;
  }, [details]);

  // Calculate total portfolio value for the pie chart
  const totalPortfolioValue = useMemo(() => {
    if (!details) return 0;
    return details.openTrades.reduce((sum, item) => sum + item.value, 0);
  }, [details]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    )
  }

  if (!details) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No portfolio details available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top section: Financial Metrics and Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Financial Metrics - Left Side in 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Available Cash */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold">{formatCurrency(details.availableCash, details.currency)}</div>
              <p className="text-xs text-muted-foreground">
                Cash + Market Value of Open Positions
              </p>
            </CardContent>
          </Card>

          {/* Equity Value */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Equity Value</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold">{formatCurrency(details.equityValue, details.currency)}</div>
              <p className="text-xs text-muted-foreground">
                Initial Balance + Realized P/L + Unrealized P/L
              </p>
            </CardContent>
          </Card>

          {/* Realized P&L */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className={`text-2xl font-bold ${details.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(details.realizedPnL, details.currency)}
              </div>
              <p className="text-xs text-muted-foreground">Profits from Closed Trades</p>
            </CardContent>
          </Card>

          {/* Deposits & Withdrawals */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Deposits & Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-sm">Deposits:</span>
                  <span className="text-sm font-medium">{formatCurrency(details.totalDeposits, details.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Withdrawals:</span>
                  <span className="text-sm font-medium">{formatCurrency(details.totalWithdrawals, details.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Allocation Chart - Right Side */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle>Portfolio Allocation</CardTitle>
            <CardDescription>
              Cash and Invested Positions
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0 flex items-center justify-center">
            <div className="w-full max-w-[250px] aspect-square">
              <PieChart width={250} height={250}>
                <Tooltip content={<ChartTooltipContent />} />
                <Pie
                  data={details.openTrades}
                  dataKey="value"
                  nameKey="symbol"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {details.openTrades.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-xl font-bold"
                            >
                              {formatCurrency(totalPortfolioValue, details.currency)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 20}
                              className="fill-muted-foreground text-xs"
                            >
                              Total Value
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-4">
            <div className="grid grid-cols-2 gap-2 w-full">
              {details.openTrades.map((item) => (
                <div key={item.symbol} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs">{item.symbol} ({((item.value / totalPortfolioValue) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 