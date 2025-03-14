'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from '@/lib/hooks/useUser'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { usePortfolio } from '@/lib/context/PortfolioContext'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface Strategy {
  id: string
  name: string
  description: string
  user_id: string
  portfolio_id: string
  created_at: string
}

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const { selectedPortfolio, refreshPortfolios, isLoading: portfolioLoading, portfolios } = usePortfolio()
  const [isLoading, setIsLoading] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false)
  const [isPortfolioSettingsOpen, setIsPortfolioSettingsOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: ''
  })
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: ''
  })
  const [isDeletePortfolioDialogOpen, setIsDeletePortfolioDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isCreatePortfolioDialogOpen, setIsCreatePortfolioDialogOpen] = useState(false)
  const [newPortfolioForm, setNewPortfolioForm] = useState({
    name: '',
    initial_balance: '',
    currency: 'PHP',
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (selectedPortfolio && user?.id) {
      loadStrategies()
    }
  }, [selectedPortfolio, user?.id])

  useEffect(() => {
    if (selectedPortfolio && isPortfolioSettingsOpen) {
      setPortfolioForm({
        name: selectedPortfolio.name,
        description: ''  // Initialize with empty string since description is not in the Portfolio type
      });
    }
  }, [selectedPortfolio, isPortfolioSettingsOpen]);

  useEffect(() => {
    if (!isDeletePortfolioDialogOpen) {
      setDeleteConfirmation('')
    }
  }, [isDeletePortfolioDialogOpen])

  useEffect(() => {
    if (!portfolioLoading && portfolios && portfolios.length === 0) {
      setIsCreatePortfolioDialogOpen(true)
    }
  }, [portfolioLoading, portfolios])

  const loadStrategies = async () => {
    if (!selectedPortfolio || !user?.id) return;
    
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStrategies(data || [])
    } catch (error) {
      console.error('Error loading strategies:', error)
      toast({
        title: 'Error',
        description: 'Failed to load strategies',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStrategySubmit = async () => {
    try {
      setIsLoading(true)
      if (!strategyForm.name.trim()) {
        toast({
          title: 'Error',
          description: 'Strategy name is required',
          variant: 'destructive'
        })
        return
      }

      if (editingStrategy) {
        const { error } = await supabase
          .from('strategies')
          .update({
            name: strategyForm.name,
            description: strategyForm.description
          })
          .eq('id', editingStrategy.id)

        if (error) throw error
        toast({
          title: 'Success',
          description: 'Strategy updated successfully'
        })
      } else {
        const { error } = await supabase
          .from('strategies')
          .insert({
            name: strategyForm.name,
            description: strategyForm.description,
            user_id: user?.id,
            portfolio_id: selectedPortfolio?.id
          })

        if (error) throw error
        toast({
          title: 'Success',
          description: 'Strategy created successfully'
        })
      }

      setIsStrategyDialogOpen(false)
      setEditingStrategy(null)
      setStrategyForm({ name: '', description: '' })
      loadStrategies()
    } catch (error) {
      console.error('Error saving strategy:', error)
      toast({
        title: 'Error',
        description: 'Failed to save strategy',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePortfolioSettingsSubmit = async () => {
    if (!selectedPortfolio) return;
    
    try {
      setIsLoading(true);
      if (!portfolioForm.name.trim()) {
        toast({
          title: 'Error',
          description: 'Portfolio name is required',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('portfolios')
        .update({
          name: portfolioForm.name,
          // Not updating description since it doesn't exist on the Portfolio type
        })
        .eq('id', selectedPortfolio.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Portfolio settings updated successfully'
      });
      
      setIsPortfolioSettingsOpen(false);
      await refreshPortfolios();
    } catch (error) {
      console.error('Error updating portfolio:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portfolio settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;
    
    try {
      setIsLoading(true);
      
      // Store the current portfolio ID for later reference
      const deletedPortfolioId = selectedPortfolio.id;
      
      // Check if user has only one portfolio - don't allow deletion of the last portfolio
      if (portfolioLoading === false && portfolios && portfolios.length <= 1) {
        toast({
          title: 'Cannot delete portfolio',
          description: 'You must have at least one portfolio. Create a new portfolio before deleting this one.',
          variant: 'destructive'
        });
        setIsDeletePortfolioDialogOpen(false);
        return;
      }
      
      // Proceed with deletion
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', selectedPortfolio.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Portfolio deleted successfully'
      });
      
      // Close all dialogs
      setIsDeletePortfolioDialogOpen(false);
      setIsPortfolioSettingsOpen(false);
      
      // Refresh portfolios
      await refreshPortfolios();
      
      // If after deletion there are no portfolios, show the create dialog
      if (portfolios && portfolios.length <= 1) {
        setIsCreatePortfolioDialogOpen(true);
      }
      
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete portfolio. Make sure to delete all trades first.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy)
    setStrategyForm({
      name: strategy.name,
      description: strategy.description
    })
    setIsStrategyDialogOpen(true)
  }

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
      return
    }

    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', strategyId)

      if (error) throw error
      toast({
        title: 'Success',
        description: 'Strategy deleted successfully'
      })
      loadStrategies()
    } catch (error) {
      console.error('Error deleting strategy:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete strategy',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    if (!selectedPortfolio) return;
    
    try {
      setIsLoading(true)
      // TODO: Implement data export for specific portfolio
      toast({
        title: "Coming Soon",
        description: "Portfolio data export functionality will be available soon.",
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePortfolio = async () => {
    try {
      setIsLoading(true)
      
      const balance = parseFloat(newPortfolioForm.initial_balance)
      if (!newPortfolioForm.name || isNaN(balance) || balance <= 0) {
        toast({
          title: 'Invalid Input',
          description: 'Please provide a valid portfolio name and initial balance',
          variant: 'destructive'
        })
        return
      }

      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          name: newPortfolioForm.name,
          user_id: user?.id,
          initial_balance: balance,
          current_balance: balance,
          available_cash: balance,
          equity_value: balance,
          currency: newPortfolioForm.currency
        })
        .select('*')
        .single()

      if (error) {
        console.error('Portfolio creation error:', error)
        throw error
      }
      
      toast({
        title: 'Success',
        description: 'Portfolio created successfully'
      })
      
      // Reset form and close dialog
      setNewPortfolioForm({
        name: '',
        initial_balance: '',
        currency: 'PHP',
      })
      setIsCreatePortfolioDialogOpen(false)
      
      // Refresh portfolios to include the new one
      await refreshPortfolios()
      
    } catch (error) {
      console.error('Error creating portfolio:', error)
      toast({
        title: 'Error',
        description: 'Failed to create portfolio',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || portfolioLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!selectedPortfolio) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-2">No Portfolio Selected</h2>
          <p className="text-muted-foreground">
            Please select a portfolio to view and manage its settings
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Portfolio Settings</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Portfolio Information</CardTitle>
              <CardDescription>Manage your portfolio settings</CardDescription>
            </div>
            <Button
              onClick={() => setIsPortfolioSettingsOpen(true)}
              size="sm"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="text-base">{selectedPortfolio.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Balance</Label>
                  <p className="text-base">₱{selectedPortfolio.available_cash.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Trading Strategies</CardTitle>
              <CardDescription>Manage your trading strategies</CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingStrategy(null)
                setStrategyForm({ name: '', description: '' })
                setIsStrategyDialogOpen(true)
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Strategy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No strategies added yet
                </p>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <h3 className="font-medium">{strategy.name}</h3>
                        {strategy.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {strategy.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditStrategy(strategy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStrategy(strategy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Export your portfolio trading data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportData}>
              Export Portfolio Data
            </Button>
          </CardContent>
        </Card>

        {/* Delete Portfolio Card */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Portfolio</CardTitle>
            <CardDescription>Permanently delete this portfolio and all its data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deleting this portfolio will permanently remove all associated strategies, trades, and performance data. This action cannot be undone.
              </p>
              <Button 
                variant="destructive" 
                onClick={() => setIsDeletePortfolioDialogOpen(true)}
                disabled={portfolios && portfolios.length <= 1}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Portfolio
              </Button>
              {portfolios && portfolios.length <= 1 && (
                <p className="text-xs text-destructive mt-2">
                  You cannot delete your only portfolio. Create a new portfolio first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Dialog */}
      <Dialog open={isStrategyDialogOpen} onOpenChange={setIsStrategyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStrategy ? 'Edit Strategy' : 'Add Strategy'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="strategyName">Strategy Name</Label>
              <Input
                id="strategyName"
                value={strategyForm.name}
                onChange={(e) => setStrategyForm({ ...strategyForm, name: e.target.value })}
                placeholder="Enter strategy name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategyDescription">Description (Optional)</Label>
              <Textarea
                id="strategyDescription"
                value={strategyForm.description}
                onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                placeholder="Enter strategy description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStrategyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleStrategySubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio Settings Dialog */}
      <Dialog open={isPortfolioSettingsOpen} onOpenChange={setIsPortfolioSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Portfolio Settings</DialogTitle>
            <DialogDescription>
              Update your portfolio name and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="portfolioName">Portfolio Name</Label>
              <Input
                id="portfolioName"
                value={portfolioForm.name}
                onChange={(e) => setPortfolioForm({...portfolioForm, name: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => setIsDeletePortfolioDialogOpen(true)}
              disabled={isLoading}
            >
              Delete Portfolio
            </Button>
            <Button type="button" onClick={handlePortfolioSettingsSubmit} disabled={isLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Portfolio Confirmation Dialog */}
      <Dialog open={isDeletePortfolioDialogOpen} onOpenChange={setIsDeletePortfolioDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Portfolio Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the portfolio
              "{selectedPortfolio?.name}" and all associated data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm font-medium text-destructive">
              Note: All strategies in this portfolio will also be deleted.
              Make sure you've exported any important data before deleting.
            </p>

            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation" className="font-medium">
                Type <span className="font-bold">{selectedPortfolio?.name}</span> to confirm
              </Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type portfolio name here"
                className={deleteConfirmation && deleteConfirmation !== selectedPortfolio?.name ? "border-destructive" : ""}
              />
              {deleteConfirmation && deleteConfirmation !== selectedPortfolio?.name && (
                <p className="text-xs text-destructive">Portfolio name doesn't match</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeletePortfolioDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeletePortfolio} 
              disabled={isLoading || deleteConfirmation !== selectedPortfolio?.name}
            >
              {isLoading ? "Deleting..." : "Delete Portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Portfolio Dialog */}
      <Dialog 
        open={isCreatePortfolioDialogOpen} 
        onOpenChange={(open) => {
          // Only allow closing if there are existing portfolios
          if (!open && portfolios && portfolios.length > 0) {
            setIsCreatePortfolioDialogOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
            <DialogDescription>
              {portfolios && portfolios.length === 0 
                ? "You need at least one portfolio to use the trading journal." 
                : "Create a new portfolio to track different trading strategies."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="portfolioName">Portfolio Name</Label>
              <Input
                id="portfolioName"
                value={newPortfolioForm.name}
                onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, name: e.target.value })}
                placeholder="e.g., My Main Portfolio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initialBalance">Initial Balance</Label>
              <Input
                id="initialBalance"
                type="number"
                value={newPortfolioForm.initial_balance}
                onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, initial_balance: e.target.value })}
                placeholder="e.g., 10000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={newPortfolioForm.currency}
                onValueChange={(value) => setNewPortfolioForm({ ...newPortfolioForm, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            {/* Only show Cancel if there are existing portfolios */}
            {portfolios && portfolios.length > 0 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreatePortfolioDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button 
              type="button" 
              onClick={handleCreatePortfolio} 
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 