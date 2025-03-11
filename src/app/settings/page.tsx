'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/services/supabase'
import { toast } from 'sonner'
import { exportService } from '@/lib/services/exportService'

type Strategy = {
  id: string
  name: string
  description: string
  created_at: string
}

export default function SettingsPage() {
  const { user } = useUser()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchStrategies() {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setStrategies(data || [])
      } catch (error) {
        console.error('Error fetching strategies:', error)
        toast.error('Failed to load strategies')
      } finally {
        setLoading(false)
      }
    }

    fetchStrategies()
  }, [user?.id])

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || submitting) return

    try {
      setSubmitting(true)
      const { data, error } = await supabase
        .from('strategies')
        .insert([
          {
            name: newStrategy.name,
            description: newStrategy.description,
            user_id: user.id
          }
        ])
        .select()

      if (error) throw error

      setStrategies([...(data || []), ...strategies])
      setNewStrategy({ name: '', description: '' })
      toast.success('Strategy added successfully')
    } catch (error) {
      console.error('Error adding strategy:', error)
      toast.error('Failed to add strategy')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id)

      if (error) throw error

      setStrategies(strategies.filter(s => s.id !== id))
      toast.success('Strategy deleted successfully')
    } catch (error) {
      console.error('Error deleting strategy:', error)
      toast.error('Failed to delete strategy')
    }
  }

  const handleExportData = async () => {
    if (!user?.id) return

    try {
      const csvContent = await exportService.exportTrades(user.id)
      const filename = `trading-journal-export-${new Date().toISOString().split('T')[0]}.csv`
      exportService.downloadCsv(csvContent, filename)
      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trading Strategies</CardTitle>
            <CardDescription>
              Manage your trading strategies to better track and analyze your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStrategy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  value={newStrategy.name}
                  onChange={e => setNewStrategy({ ...newStrategy, name: e.target.value })}
                  placeholder="e.g., Breakout Trading"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newStrategy.description}
                  onChange={e => setNewStrategy({ ...newStrategy, description: e.target.value })}
                  placeholder="Brief description of your strategy"
                  disabled={submitting}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Strategy'}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Your Strategies</h3>
              {strategies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No strategies added yet</p>
              ) : (
                <div className="space-y-4">
                  {strategies.map(strategy => (
                    <div
                      key={strategy.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{strategy.name}</h4>
                        {strategy.description && (
                          <p className="text-sm text-muted-foreground">{strategy.description}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteStrategy(strategy.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and notification settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email} disabled />
              </div>
              {/* Add more account settings as needed */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export or import your trading data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                >
                  Export Data
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Download your trading data in CSV format
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() => toast.info('Import functionality coming soon')}
                >
                  Import Data
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Import trading data from a CSV file
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 