'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Trade } from '@/lib/types/trade'

interface TradeDetailsSheetProps {
  trade: Trade
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function TradeDetailsSheet({ trade, isOpen, setIsOpen }: TradeDetailsSheetProps) {
  if (!trade) return null

  const marketLabel = trade.market === 'PH' ? 'Philippine' : 'US'
  const currencySymbol = trade.market === 'PH' ? '₱' : '$'
  
  const getPnlColor = (pnl: number | null) => {
    if (!pnl) return 'text-gray-500'
    return pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-gray-500'
  }

  // Get strategy name safely from either string or object
  const getStrategyName = () => {
    if (!trade.strategy) return null
    if (typeof trade.strategy === 'string') return trade.strategy
    if (typeof trade.strategy === 'object' && trade.strategy.name) return trade.strategy.name
    return null
  }

  const strategyName = getStrategyName()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex justify-between items-center">
            <span>{trade.symbol}</span>
            <Badge variant={trade.side === 'long' ? 'default' : 'destructive'}>
              {trade.side === 'long' ? 'Long' : 'Short'}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {marketLabel} {trade.asset_type} trade on {formatDate(trade.date || trade.created_at)}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entry Price</p>
              <p className="text-lg font-semibold">{formatCurrency(trade.entry_price, currencySymbol)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quantity</p>
              <p className="text-lg font-semibold">{trade.quantity}</p>
            </div>
          </div>
          
          {trade.exit_price && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exit Price</p>
                <p className="text-lg font-semibold">{formatCurrency(trade.exit_price, currencySymbol)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">P&L</p>
                <p className={`text-lg font-semibold ${getPnlColor(trade.pnl)}`}>
                  {trade.pnl !== null ? formatCurrency(trade.pnl, currencySymbol) : 'N/A'}
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Price</p>
              <p className="text-lg font-semibold">
                {trade.current_price ? formatCurrency(trade.current_price, currencySymbol) : 'Loading...'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-lg font-semibold">
                <Badge variant={trade.status === 'open' ? 'outline' : 'secondary'}>
                  {trade.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </p>
            </div>
          </div>
          
          {strategyName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Strategy</p>
              <p className="text-lg font-semibold">{strategyName}</p>
            </div>
          )}
          
          {trade.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <div className="bg-muted p-3 rounded-md mt-1">
                <p className="text-sm whitespace-pre-line">{trade.notes}</p>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 