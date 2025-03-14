import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Portfolio } from '@/lib/types/trade'
import { formatCurrency } from '@/lib/utils'

interface PortfolioManagerProps {
  portfolios: Portfolio[]
  selectedPortfolioId: string
  onPortfolioSelect: (portfolioId: string) => void
  onPortfolioCreate: (portfolio: Omit<Portfolio, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void
}

export function PortfolioManager({
  portfolios,
  selectedPortfolioId,
  onPortfolioSelect,
  onPortfolioCreate,
}: PortfolioManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState({
    name: '',
    initial_balance: '',
    currency: 'PHP',
  })
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const balance = parseFloat(newPortfolio.initial_balance)
    if (!newPortfolio.name || isNaN(balance) || balance <= 0) return

    onPortfolioCreate({
      name: newPortfolio.name,
      initial_balance: balance,
      current_balance: balance,
      currency: newPortfolio.currency,
    })

    setNewPortfolio({
      name: '',
      initial_balance: '',
      currency: 'PHP',
    })
    setIsCreating(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? 'Cancel' : 'Add New'}
        </Button>
      </CardHeader>
      <CardContent>
        {isCreating ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name</Label>
              <Input
                id="name"
                value={newPortfolio.name}
                onChange={(e) =>
                  setNewPortfolio({ ...newPortfolio, name: e.target.value })
                }
                placeholder="Enter portfolio name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_balance">Initial Balance</Label>
              <Input
                id="initial_balance"
                type="number"
                value={newPortfolio.initial_balance}
                onChange={(e) =>
                  setNewPortfolio({
                    ...newPortfolio,
                    initial_balance: e.target.value,
                  })
                }
                placeholder="Enter initial balance"
              />
            </div>
            <Button type="submit" className="w-full">
              Create Portfolio
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            {portfolios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No portfolios found. Create one to start trading.
              </p>
            ) : (
              portfolios.map((portfolio) => (
                <div
                  key={portfolio.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    portfolio.id === selectedPortfolioId
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => onPortfolioSelect(portfolio.id)}
                >
                  <div className="font-medium">{portfolio.name}</div>
                  <div className="text-sm opacity-90">
                    Balance: {formatCurrency(portfolio.current_balance)} {portfolio.currency}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 