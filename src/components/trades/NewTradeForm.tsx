'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/services/supabase'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { STOCK_SYMBOLS, FOREX_PAIRS, CRYPTO_SYMBOLS } from '@/lib/data/stockSymbols'
import { getPhStocks, DEFAULT_PH_STOCKS } from '@/lib/services/phStockService'
import { Combobox } from '@/components/ui/combobox'

type Strategy = {
  id: string
  name: string
}

type AssetType = 'stocks' | 'forex' | 'crypto'
type Market = 'US' | 'PH'

export function NewTradeForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [symbolPopoverOpen, setSymbolPopoverOpen] = useState(false)
  const [phStocks, setPhStocks] = useState<string[]>(DEFAULT_PH_STOCKS)
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false)
  const [formData, setFormData] = useState({
    symbol: '',
    side: 'long',
    entry_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    strategy_id: '',
    notes: '',
    asset_type: 'stocks' as AssetType,
    market: 'PH' as Market
  })

  const [availableSymbols, setAvailableSymbols] = useState<{ value: string, label: string }[]>([])

  useEffect(() => {
    // Fetch PH stocks when component mounts
    async function fetchPhStocks() {
      try {
        setIsLoadingSymbols(true)
        // First set default stocks to avoid the empty state
        setPhStocks(DEFAULT_PH_STOCKS)
        
        // Then fetch from API
        const stocks = await getPhStocks()
        if (stocks.length > 0) {
          setPhStocks(stocks)
        }
      } catch (error) {
        console.error('Error fetching PH stocks:', error)
        toast.error('Failed to load PH stocks')
      } finally {
        setIsLoadingSymbols(false)
      }
    }

    fetchPhStocks()
  }, [])

  useEffect(() => {
    // Update available symbols
    setAvailableSymbols(
      phStocks.map(symbol => ({ value: symbol, label: symbol }))
    )
  }, [phStocks])

  useEffect(() => {
    console.log("Combobox props:", {
      isLoadingSymbols,
      availableSymbolsLength: availableSymbols.length,
      disabled: isLoadingSymbols || availableSymbols.length === 0
    });
  }, [isLoadingSymbols, availableSymbols]);

  useEffect(() => {
    async function fetchStrategies() {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('id, name')
          .eq('user_id', user.id)

        if (error) throw error
        setStrategies(data || [])
      } catch (error) {
        console.error('Error fetching strategies:', error)
        toast.error('Failed to load strategies')
      }
    }

    fetchStrategies()
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || loading) return

    try {
      setLoading(true)

      // Validate required fields
      if (!formData.symbol || !formData.entry_price || !formData.quantity) {
        toast.error('Please fill in all required fields')
        return
      }

      const { error } = await supabase.from('trades').insert([
        {
          user_id: user.id,
          symbol: formData.symbol,
          side: formData.side,
          entry_price: parseFloat(formData.entry_price),
          quantity: parseInt(formData.quantity),
          stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
          take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
          strategy_id: formData.strategy_id || null,
          notes: formData.notes,
          status: 'open',
          asset_type: formData.asset_type,
          market: formData.market,
          created_at: new Date().toISOString()
        }
      ])

      if (error) throw error

      toast.success('Trade added successfully')
      onSuccess()
    } catch (error) {
      console.error('Error adding trade:', error)
      toast.error('Failed to add trade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Combobox
            options={availableSymbols}
            value={formData.symbol}
            onValueChange={(value) => setFormData({ ...formData, symbol: value })}
            placeholder="Select symbol"
            emptyMessage={isLoadingSymbols ? "Loading symbols..." : "No symbols found"}
            disabled={isLoadingSymbols || availableSymbols.length === 0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="side">Side</Label>
          <Select
            value={formData.side}
            onValueChange={(value) => setFormData({ ...formData, side: value })}
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
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stop_loss">Stop Loss</Label>
          <Input
            id="stop_loss"
            type="number"
            step="0.01"
            value={formData.stop_loss}
            onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="take_profit">Take Profit</Label>
          <Input
            id="take_profit"
            type="number"
            step="0.01"
            value={formData.take_profit}
            onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
          />
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
          <Input
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this trade..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding Trade...' : 'Add Trade'}
        </Button>
      </div>
    </form>
  )
} 