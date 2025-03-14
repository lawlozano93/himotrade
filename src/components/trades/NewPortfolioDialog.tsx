'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NewPortfolioDialogProps {
  onPortfolioCreated?: () => void
}

export default function NewPortfolioDialog({ onPortfolioCreated }: NewPortfolioDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    initial_balance: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.initial_balance) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Get the current user's ID first
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('You must be logged in to create a portfolio')
      }
      
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id, // Add the user_id explicitly
          name: formData.name,
          initial_balance: parseFloat(formData.initial_balance),
          available_cash: parseFloat(formData.initial_balance),
          equity_value: parseFloat(formData.initial_balance), // Also include equity_value
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating portfolio:', error)
        throw error
      }

      toast({
        title: 'Success',
        description: 'Portfolio created successfully',
      })

      setFormData({ name: '', initial_balance: '' })
      setIsOpen(false)
      onPortfolioCreated?.()
    } catch (error) {
      console.error('Error creating portfolio:', error)
      toast({
        title: 'Error',
        description: 'Failed to create portfolio',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">New Portfolio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
          <DialogDescription>
            Enter the details for your new portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Portfolio Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter portfolio name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initial_balance">Initial Balance</Label>
              <Input
                id="initial_balance"
                type="number"
                value={formData.initial_balance}
                onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                placeholder="Enter initial balance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 