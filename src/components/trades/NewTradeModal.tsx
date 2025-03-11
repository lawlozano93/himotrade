'use client'

import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import { NewTradeForm } from "./NewTradeForm"
import { useState } from "react"

export function NewTradeModal({ onTradeAdded }: { onTradeAdded?: () => void }) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onTradeAdded?.()
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>Add New Trade</Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add New Trade</ModalTitle>
        </ModalHeader>
        <NewTradeForm onSuccess={handleSuccess} />
      </ModalContent>
    </Modal>
  )
} 