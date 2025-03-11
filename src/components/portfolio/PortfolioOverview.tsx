"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { portfolioService, type Portfolio } from "@/lib/services/portfolioService"
import { useUser } from "@/lib/hooks/useUser"
import { formatCurrency } from "@/lib/utils"

export function PortfolioOverview() {
  const { user } = useUser()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchPortfolios = async () => {
      try {
        const data = await portfolioService.getPortfolios(user.id)
        setPortfolios(data)
      } catch (error) {
        console.error("Failed to fetch portfolios:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolios()
  }, [user])

  if (loading) {
    return <div>Loading...</div>
  }

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No portfolios found. Create one to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {portfolios.map((portfolio) => (
        <Card key={portfolio.id}>
          <CardHeader>
            <CardTitle>{portfolio.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total Value"
                value={formatCurrency(portfolio.current_balance, portfolio.currency)}
                subtitle={`Initial: ${formatCurrency(portfolio.initial_balance, portfolio.currency)}`}
              />
              <MetricCard
                title="Available Cash"
                value={formatCurrency(portfolio.available_cash, portfolio.currency)}
                subtitle={`${((portfolio.available_cash / portfolio.current_balance) * 100).toFixed(2)}% of portfolio`}
              />
              <MetricCard
                title="Realized P&L"
                value={formatCurrency(portfolio.realized_pnl, portfolio.currency)}
                subtitle={`${((portfolio.realized_pnl / portfolio.initial_balance) * 100).toFixed(2)}% return`}
                valueClassName={portfolio.realized_pnl >= 0 ? "text-green-600" : "text-red-600"}
              />
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Portfolio Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  title="Total Deposits"
                  value={formatCurrency(portfolio.total_deposits, portfolio.currency)}
                  subtitle="All time"
                />
                <MetricCard
                  title="Total Withdrawals"
                  value={formatCurrency(portfolio.total_withdrawals, portfolio.currency)}
                  subtitle="All time"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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