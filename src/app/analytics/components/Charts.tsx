'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, BarChart } from "@tremor/react"

type Props = {
  keyMetrics: {
    winRate: { current: number; change: number }
    profitFactor: { current: number; change: number }
    averageRR: { current: number; change: number }
    totalPnL: { current: number; change: number }
  }
  monthlyPerformance: Array<{
    month: string
    pnl: number
  }>
  strategyPerformance: Array<{
    strategy: string
    pnl: number
    winRate: number
    trades: number
  }>
}

export function Charts({ keyMetrics, monthlyPerformance, strategyPerformance }: Props) {
  const customTooltipFormatter = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const percentageFormatter = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze your trading performance and patterns
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.winRate.current.toFixed(1)}%</div>
            <p className={`text-xs mt-1 ${keyMetrics.winRate.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {keyMetrics.winRate.change >= 0 ? '+' : ''}{keyMetrics.winRate.change.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.profitFactor.current.toFixed(2)}</div>
            <p className={`text-xs mt-1 ${keyMetrics.profitFactor.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {keyMetrics.profitFactor.change >= 0 ? '+' : ''}{keyMetrics.profitFactor.change.toFixed(2)} from last month
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average R:R</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.averageRR.current.toFixed(2)}</div>
            <p className={`text-xs mt-1 ${keyMetrics.averageRR.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {keyMetrics.averageRR.change >= 0 ? '+' : ''}{keyMetrics.averageRR.change.toFixed(2)} from last month
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${keyMetrics.totalPnL.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className={`text-xs mt-1 ${keyMetrics.totalPnL.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {keyMetrics.totalPnL.change >= 0 ? '+' : ''}${keyMetrics.totalPnL.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={monthlyPerformance}
              index="month"
              categories={["pnl"]}
              colors={["blue"]}
              valueFormatter={customTooltipFormatter}
              showLegend={false}
              className="h-[300px]"
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={strategyPerformance}
              index="strategy"
              categories={["winRate"]}
              colors={["blue"]}
              valueFormatter={percentageFormatter}
              showLegend={false}
              className="h-[300px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 