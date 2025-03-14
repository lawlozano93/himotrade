'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import type { TradeResponse } from '@/lib/types/index'
import { tradeService } from '@/lib/services/tradeService'
import { portfolioService } from '@/lib/services/portfolioService'

interface TradeDetailsModalProps {
  trade: TradeResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TradeDetailsModal = ({ trade, open, onOpenChange }: TradeDetailsModalProps) => {
  if (!trade) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: trade.market === 'PH' ? 'PHP' : 'USD'
    }).format(value)
  }

  const calculatePnL = () => {
    if (!trade.exit_price) return null
    const pnl = (trade.exit_price - trade.entry_price) * trade.quantity
    return trade.side === 'short' ? -pnl : pnl
  }

  const pnl = calculatePnL()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Trade Details - {trade.symbol}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Symbol</div>
            <div>{trade.symbol}</div>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Side</div>
            <div className="capitalize">{trade.side}</div>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Entry Price</div>
            <div>{formatCurrency(trade.entry_price)}</div>
          </div>
          {trade.exit_price && (
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="font-medium">Exit Price</div>
              <div>{formatCurrency(trade.exit_price)}</div>
            </div>
          )}
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Quantity</div>
            <div>{trade.quantity}</div>
          </div>
          {pnl !== null && (
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="font-medium">P&L</div>
              <div className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(pnl)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Status</div>
            <div className="capitalize">{trade.status}</div>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="font-medium">Entry Date</div>
            <div>{format(new Date(trade.entry_date), 'PPP')}</div>
          </div>
          {trade.exit_date && (
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="font-medium">Exit Date</div>
              <div>{format(new Date(trade.exit_date), 'PPP')}</div>
            </div>
          )}
          {trade.notes && (
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="font-medium">Notes</div>
              <div>{trade.notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TradeDetailsModal 