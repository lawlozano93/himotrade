'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ChevronDown, Plus } from 'lucide-react'
import type { Portfolio } from '@/lib/types'
import NewPortfolioDialog from "./NewPortfolioDialog"
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
import { portfolioService } from '@/lib/services/portfolioService'

interface PortfolioSelectorProps {
  selectedPortfolio: Portfolio | null
  onPortfolioSelect: (portfolio: Portfolio | null) => void
  onPortfolioCreated: () => void
}

export default function PortfolioSelector({ selectedPortfolio, onPortfolioSelect, onPortfolioCreated }: PortfolioSelectorProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [isUpdateFundsOpen, setIsUpdateFundsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [fundUpdate, setFundUpdate] = useState({
    amount: '',
    type: 'deposit' as 'deposit' | 'withdrawal'
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadPortfolios()
  }, [])

  const loadPortfolios = async () => {
    try {
      setIsLoading(true)
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false })

      if (portfoliosError) throw portfoliosError

      setPortfolios(portfoliosData || [])
      if (!selectedPortfolio && portfoliosData && portfoliosData.length > 0) {
        onPortfolioSelect(portfoliosData[0])
      }
    } catch (error) {
      console.error('Error loading portfolios:', error)
      toast({
        title: 'Error',
        description: 'Failed to load portfolios',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateFunds = async () => {
    if (!selectedPortfolio || !fundUpdate.amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)
      const amount = parseFloat(fundUpdate.amount)
      const adjustedAmount = fundUpdate.type === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount)

      // Record the transaction and update the portfolio balance
      try {
        await portfolioService.createTransaction(
          selectedPortfolio.id,
          {
            amount: adjustedAmount,
            type: fundUpdate.type,
            notes: `${fundUpdate.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${Math.abs(adjustedAmount)}`
          }
        )
      } catch (transactionError) {
        throw transactionError
      }

      toast({
        title: 'Success',
        description: `Funds ${fundUpdate.type === 'deposit' ? 'deposited' : 'withdrawn'} successfully`,
      })
      setIsUpdateFundsOpen(false)
      setFundUpdate({ amount: '', type: 'deposit' })
      loadPortfolios()
    } catch (error) {
      console.error('Error updating funds:', error)
      toast({
        title: 'Error',
        description: 'Failed to update funds',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;
    
    // Check if the confirmation name matches the portfolio name
    if (deleteConfirmName !== selectedPortfolio.name) {
      toast({
        title: 'Error',
        description: 'Portfolio name does not match. Deletion cancelled.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', selectedPortfolio.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Portfolio deleted successfully',
      });
      
      // Reset the confirmation name and close the dialog
      setDeleteConfirmName('');
      setIsDeleteDialogOpen(false);
      
      // Reload portfolios and select the first one if available
      loadPortfolios();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete portfolio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading portfolios...</div>
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-between">
            {selectedPortfolio ? selectedPortfolio.name : "Select Portfolio"}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]">
          {portfolios.length > 0 ? (
            <>
              {portfolios.map((portfolio) => (
                <DropdownMenuItem key={portfolio.id} onSelect={() => onPortfolioSelect(portfolio)}>
                  {portfolio.name} (₱{portfolio.available_cash.toLocaleString()})
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <NewPortfolioDialog onPortfolioCreated={onPortfolioCreated} />
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedPortfolio && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsUpdateFundsOpen(true)}>
              Update Funds
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
              Delete Portfolio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={isUpdateFundsOpen} onOpenChange={setIsUpdateFundsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Portfolio Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={fundUpdate.amount}
                onChange={(e) => setFundUpdate({ ...fundUpdate, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={fundUpdate.type}
                onValueChange={(value: 'deposit' | 'withdrawal') => 
                  setFundUpdate({ ...fundUpdate, type: value })
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
            <Button 
              className="w-full" 
              onClick={handleUpdateFunds}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Funds'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Portfolio Alert Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmName('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the portfolio
              <strong> {selectedPortfolio?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmName" className="text-sm font-medium">
              Type <span className="font-semibold">{selectedPortfolio?.name}</span> to confirm
            </Label>
            <Input
              id="confirmName"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="mt-2"
              placeholder={`Type "${selectedPortfolio?.name}" to confirm`}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmName('');
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePortfolio}
              disabled={deleteConfirmName !== selectedPortfolio?.name}
              className={deleteConfirmName !== selectedPortfolio?.name ? 'bg-destructive/50 hover:bg-destructive/50 cursor-not-allowed' : 'bg-destructive hover:bg-destructive/90'}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 