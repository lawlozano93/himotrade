"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { portfolioService, type Portfolio, type PortfolioSnapshot } from "@/lib/services/portfolioService"
import { useUser } from "@/lib/hooks/useUser"
import { formatCurrency } from "@/lib/utils"
import { format, subDays } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function PortfolioPerformance() {
  const { user } = useUser()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("")
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchPortfolios = async () => {
      try {
        const data = await portfolioService.getPortfolios(user.id)
        setPortfolios(data)
        if (data.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(data[0].id)
        }
      } catch (error) {
        console.error("Failed to fetch portfolios:", error)
      }
    }

    fetchPortfolios()
  }, [user, selectedPortfolio])

  useEffect(() => {
    if (!selectedPortfolio) return

    const fetchSnapshots = async () => {
      try {
        setLoading(true)
        const endDate = format(new Date(), "yyyy-MM-dd")
        const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd")
        const data = await portfolioService.getSnapshots(selectedPortfolio, startDate, endDate)
        setSnapshots(data)
      } catch (error) {
        console.error("Failed to fetch snapshots:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSnapshots()
  }, [selectedPortfolio])

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No portfolios found. Create one to get started!</p>
      </div>
    )
  }

  const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio)
  const currency = selectedPortfolioData?.currency || "PHP"

  const chartData = snapshots.map(snapshot => ({
    date: format(new Date(snapshot.snapshot_date), "MMM d"),
    totalValue: snapshot.total_value,
    equityValue: snapshot.equity_value,
    cashValue: snapshot.cash_value,
    realizedPnL: snapshot.realized_pnl,
    unrealizedPnL: snapshot.unrealized_pnl
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalValue"
                    name="Total Value"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="equityValue"
                    name="Equity Value"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="cashValue"
                    name="Cash Value"
                    stroke="#ffc658"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="realizedPnL"
                    name="Realized P&L"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="unrealizedPnL"
                    name="Unrealized P&L"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPortfolioData && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total Return"
                value={formatCurrency(
                  selectedPortfolioData.current_balance - selectedPortfolioData.initial_balance,
                  currency
                )}
                subtitle={`${(((selectedPortfolioData.current_balance - selectedPortfolioData.initial_balance) / selectedPortfolioData.initial_balance) * 100).toFixed(2)}%`}
                valueClassName={selectedPortfolioData.current_balance >= selectedPortfolioData.initial_balance ? "text-green-600" : "text-red-600"}
              />
              <MetricCard
                title="Realized P&L"
                value={formatCurrency(selectedPortfolioData.realized_pnl, currency)}
                subtitle={`${((selectedPortfolioData.realized_pnl / selectedPortfolioData.initial_balance) * 100).toFixed(2)}% of initial`}
                valueClassName={selectedPortfolioData.realized_pnl >= 0 ? "text-green-600" : "text-red-600"}
              />
              <MetricCard
                title="Cash Allocation"
                value={formatCurrency(selectedPortfolioData.available_cash, currency)}
                subtitle={`${((selectedPortfolioData.available_cash / selectedPortfolioData.current_balance) * 100).toFixed(2)}% of portfolio`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  valueClassName = "" 
}: { 
  title: string
  value: string
  subtitle: string
  valueClassName?: string
}) {
  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
    </div>
  )
} 