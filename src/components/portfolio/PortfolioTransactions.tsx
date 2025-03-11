"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { portfolioService, type Portfolio, type PortfolioTransaction } from "@/lib/services/portfolioService"
import { useUser } from "@/lib/hooks/useUser"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export function PortfolioTransactions() {
  const { user } = useUser()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("")
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([])
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

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const data = await portfolioService.getTransactions(selectedPortfolio)
        setTransactions(data)
      } catch (error) {
        console.error("Failed to fetch transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [selectedPortfolio])

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No portfolios found. Create one to get started!</p>
      </div>
    )
  }

  const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio)

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

        <AddTransactionDialog
          portfolioId={selectedPortfolio}
          currency={selectedPortfolioData?.currency || "PHP"}
          onSuccess={() => {
            // Refresh transactions
            portfolioService.getTransactions(selectedPortfolio).then(setTransactions)
            // Refresh portfolios to update balances
            portfolioService.getPortfolios(user!.id).then(setPortfolios)
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), "PPP")}
                    </div>
                    {transaction.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {transaction.notes}
                      </div>
                    )}
                  </div>
                  <div className={`text-lg font-bold ${
                    transaction.type === "deposit" ? "text-green-600" : "text-red-600"
                  }`}>
                    {transaction.type === "deposit" ? "+" : "-"}
                    {formatCurrency(transaction.amount, selectedPortfolioData?.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddTransactionDialog({
  portfolioId,
  currency,
  onSuccess
}: {
  portfolioId: string
  currency: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: "deposit",
    amount: "",
    notes: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!portfolioId) return

    try {
      setLoading(true)
      await portfolioService.addTransaction(
        portfolioId,
        formData.type as "deposit" | "withdrawal",
        parseFloat(formData.amount),
        formData.notes
      )
      toast.success("Transaction added successfully")
      setOpen(false)
      setFormData({ type: "deposit", amount: "", notes: "" })
      onSuccess()
    } catch (error) {
      toast.error("Failed to add transaction")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="1000"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add a note..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 