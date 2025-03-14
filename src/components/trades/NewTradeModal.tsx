'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import TradeForm from '@/components/trades/TradeForm'

interface NewTradeModalProps {
  portfolioId: string
  onTradeAdded?: () => void
}

export function NewTradeModal({ portfolioId, onTradeAdded }: NewTradeModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add New Trade</Button>
      </DialogTrigger>
      <TradeForm
        open={isOpen}
        onOpenChange={setIsOpen}
        portfolioId={portfolioId}
        onTradeCreated={() => {
          onTradeAdded?.()
        }}
      />
    </Dialog>
  )
} 