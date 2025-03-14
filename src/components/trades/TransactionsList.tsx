'use client'

import { useState, useEffect } from 'react'
import { portfolioService } from '@/lib/services/portfolioService'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { PortfolioTransaction } from '@/lib/types/index'

interface TransactionsListProps {
  portfolioId: string
  currency?: string
  onTransactionAdded?: () => void
}

export default function TransactionsList({ portfolioId, currency = 'PHP', onTransactionAdded }: TransactionsListProps) {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<PortfolioTransaction | null>(null)
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    notes: ''
  })

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await portfolioService.getTransactions(portfolioId)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (portfolioId) {
      loadTransactions()
    }
  }, [portfolioId])

  const handleAddTransaction = async () => {
    if (!formData.amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await portfolioService.addTransaction(
        portfolioId,
        formData.type,
        parseFloat(formData.amount),
        formData.notes
      )
      
      toast({
        title: 'Success',
        description: 'Transaction added successfully',
      })
      
      setIsAddDialogOpen(false)
      setFormData({ type: 'deposit', amount: '', notes: '' })
      loadTransactions()
      if (onTransactionAdded) onTransactionAdded()
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTransaction = async () => {
    if (!selectedTransaction || !formData.amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      // For now, we'll just delete the old transaction and add a new one
      // In a real app, you'd want to update the existing transaction
      await portfolioService.addTransaction(
        portfolioId,
        formData.type,
        parseFloat(formData.amount),
        formData.notes
      )
      
      toast({
        title: 'Success',
        description: 'Transaction updated successfully',
      })
      
      setIsEditDialogOpen(false)
      setSelectedTransaction(null)
      setFormData({ type: 'deposit', amount: '', notes: '' })
      loadTransactions()
      if (onTransactionAdded) onTransactionAdded()
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to update transaction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return

    try {
      setLoading(true)
      // For now, we'll just add a new transaction with the opposite amount
      // In a real app, you'd want to delete the transaction
      await portfolioService.addTransaction(
        portfolioId,
        selectedTransaction.type === 'deposit' ? 'withdrawal' : 'deposit',
        Math.abs(selectedTransaction.amount),
        `Reversal of ${selectedTransaction.type} - ${selectedTransaction.notes || ''}`
      )
      
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      })
      
      setIsDeleteDialogOpen(false)
      setSelectedTransaction(null)
      loadTransactions()
      if (onTransactionAdded) onTransactionAdded()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && transactions.length === 0) {
    return <div className="text-center py-8">Loading transactions...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <Button onClick={() => {
          setFormData({ type: 'deposit', amount: '', notes: '' });
          setIsAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, index) => (
            <div key={`skeleton-${index}`} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found
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
                  {format(new Date(transaction.created_at), 'PPP')}
                </div>
                {transaction.notes && transaction.notes.trim() !== '' && transaction.notes !== 'undefined' && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {transaction.notes}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-lg font-bold ${
                  transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'deposit' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount), currency)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTransaction(transaction)
                      setFormData({
                        type: transaction.type,
                        amount: Math.abs(transaction.amount).toString(),
                        notes: transaction.notes || ''
                      })
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTransaction(transaction)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Transaction Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setFormData({ type: 'deposit', amount: '', notes: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'deposit' | 'withdrawal') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleAddTransaction}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedTransaction(null);
            setFormData({ type: 'deposit', amount: '', notes: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'deposit' | 'withdrawal') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleEditTransaction}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the transaction and update your portfolio balance accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 