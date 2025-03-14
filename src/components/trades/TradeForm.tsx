'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPhStocks, type StockOption } from '@/lib/services/phStockService'
import { tradeService } from '@/lib/services/tradeService'
import { calculateBoardLot, roundToValidLot } from '@/lib/utils/boardLot'
import { calculateTransactionFees } from '@/lib/utils/fees'

interface FormData {
  portfolio_id?: string
  symbol: string
  side: 'long' | 'short'
  entry_price: string
  quantity: string
  notes: string
  strategy_id: string
  entry_date: Date
}

export interface TradeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  onTradeCreated: () => void
}

const TradeForm = ({ open, onOpenChange, portfolioId, onTradeCreated }: TradeFormProps) => {
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stocks, setStocks] = useState<StockOption[]>([])
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false)
  const [strategies, setStrategies] = useState<{ id: string, name: string }[]>([])
  const [formData, setFormData] = useState<FormData>({
    portfolio_id: portfolioId,
    symbol: '',
    side: 'long',
    entry_price: '',
    quantity: '',
    notes: '',
    strategy_id: '',
    entry_date: new Date()
  })
  const [boardLotSize, setBoardLotSize] = useState<number | null>(null)
  const [suggestedQuantity, setSuggestedQuantity] = useState<number | null>(null)
  const [feesPreview, setFeesPreview] = useState<any>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!user?.id) return
    loadStocks()
    loadStrategies()
  }, [user?.id, portfolioId])

  useEffect(() => {
    if (formData.entry_price) {
      const price = parseFloat(formData.entry_price)
      if (!isNaN(price) && price > 0) {
        const lot = calculateBoardLot(price)
        setBoardLotSize(lot)
        
        if (!formData.quantity || isNaN(parseInt(formData.quantity))) {
          setSuggestedQuantity(lot)
        } else {
          const currentQty = parseInt(formData.quantity)
          const validLot = roundToValidLot(price, currentQty)
          setSuggestedQuantity(validLot !== currentQty ? validLot : null)
        }

        if (formData.quantity && !isNaN(parseInt(formData.quantity))) {
          const quantity = parseInt(formData.quantity)
          const grossAmount = price * quantity
          const fees = calculateTransactionFees(grossAmount, true)
          setFeesPreview(fees)
        } else {
          setFeesPreview(null)
        }
      }
    }
  }, [formData.entry_price, formData.quantity])

  const loadStocks = async () => {
    try {
      setIsLoadingSymbols(true)
      const stockList = await getPhStocks()
      setStocks(stockList)
    } catch (error) {
      console.error('Error loading stocks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load stocks.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingSymbols(false)
    }
  }

  const loadStrategies = async () => {
    if (!user?.id || !portfolioId) return

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('portfolio_id', portfolioId)

      if (error) throw error
      setStrategies(data || [])
    } catch (error) {
      console.error('Error loading strategies:', error)
      toast({
        title: 'Error',
        description: 'Failed to load strategies.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const entryPrice = parseFloat(formData.entry_price)
      const quantity = parseInt(formData.quantity)
      
      if (isNaN(entryPrice) || isNaN(quantity)) {
        throw new Error("Invalid entry price or quantity")
      }
      
      // Get the freshest user directly from Supabase auth
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        console.error("Error getting current user:", userError)
        toast({
          title: "Authentication Error",
          description: "Please try logging out and back in again.",
          variant: "destructive"
        })
        throw new Error("You must be logged in to create a trade")
      }
      
      console.log("Creating trade with user_id:", currentUser.id)
      
      // Test fetch from portfolios table first to verify auth is working
      console.log("Testing portfolio access for portfolio ID:", portfolioId)
      const { data: portfolioTest, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single()
        
      if (portfolioError) {
        console.error("Error accessing portfolio - auth issue likely:", portfolioError)
        toast({
          title: "Permission Error",
          description: "Cannot access the selected portfolio. Please check permissions.",
          variant: "destructive"
        })
        throw portfolioError
      }
      
      console.log("Portfolio access successful:", portfolioTest.name)
      
      try {
        await tradeService.createTrade({
          user_id: currentUser.id, // Use freshly fetched user ID
          portfolio_id: portfolioId,
          symbol: formData.symbol,
          side: formData.side,
          entry_price: entryPrice,
          quantity: quantity,
          notes: formData.notes || null,
          strategy_id: formData.strategy_id || null,
          entry_date: formData.entry_date.toISOString().split('T')[0]
        })
      } catch (tradeError) {
        console.error("Trade creation failed after portfolio access succeeded:", tradeError)
        throw tradeError
      }
      
      if (onTradeCreated) {
        onTradeCreated()
      }
      
      onOpenChange(false)
      
      // Just refresh the router without full page reload
      router.refresh()
      
    } catch (error) {
      console.error("Error creating trade:", error)
      
      // Check if the error is related to insufficient funds
      const errorMessage = error instanceof Error ? error.message : "Failed to create trade"
      const isInsufficientFunds = 
        typeof errorMessage === 'string' && 
        (errorMessage.includes('Insufficient portfolio balance') || 
         errorMessage.includes('insufficient'))
      
      toast({
        title: "Error",
        description: isInsufficientFunds 
          ? "Insufficient funds. Please add more funds to your portfolio or reduce the trade amount." 
          : errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update date format utility for string conversion
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD for input[type="date"]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formatDateForInput(formData.entry_date)}
                onChange={(e) => {
                  // Create a Date object from the input value
                  const date = e.target.value ? new Date(e.target.value) : new Date();
                  // Adjust for timezone if needed
                  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                  setFormData({ ...formData, entry_date: localDate });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Select Stock</Label>
              <Combobox
                items={stocks}
                value={formData.symbol}
                onValueChange={(value) => setFormData({ ...formData, symbol: value })}
                placeholder="Search for a stock..."
                emptyText={isLoadingSymbols ? "Loading stocks..." : "No stocks found"}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <Select
                value={formData.side}
                onValueChange={(value: 'long' | 'short') => setFormData({ ...formData, side: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity {boardLotSize && <span className="text-xs text-muted-foreground">(Board Lot: {boardLotSize})</span>}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
              {suggestedQuantity && (
                <p className="text-xs text-muted-foreground">
                  Suggested quantity based on board lot: {suggestedQuantity}
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-2 text-xs"
                    onClick={() => setFormData({ ...formData, quantity: suggestedQuantity.toString() })}
                    type="button"
                  >
                    Use this
                  </Button>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select
                value={formData.strategy_id}
                onValueChange={(value) => setFormData({ ...formData, strategy_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(strategy => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this trade..."
              />
            </div>
          </div>

          {feesPreview && (
            <div className="space-y-2 border p-3 rounded-md bg-muted/20">
              <h4 className="text-sm font-medium">Estimated Fees</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Commission:</div>
                <div>₱{feesPreview.commission.toFixed(2)}</div>
                <div>VAT:</div>
                <div>₱{feesPreview.vat.toFixed(2)}</div>
                <div>PSE Trans Fee:</div>
                <div>₱{feesPreview.pseTransFee.toFixed(2)}</div>
                <div>SEC Fee:</div>
                <div>₱{feesPreview.secFee.toFixed(2)}</div>
                <div>SCCP Fee:</div>
                <div>₱{feesPreview.sccp.toFixed(2)}</div>
                <div className="font-medium">Total Fees:</div>
                <div className="font-medium">₱{feesPreview.totalFees.toFixed(2)}</div>
                <div className="font-medium pt-1">Total Cost:</div>
                <div className="font-medium pt-1">₱{feesPreview.netAmount.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Trade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TradeForm 