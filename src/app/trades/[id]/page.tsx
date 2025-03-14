'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/services/supabase'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { PortfolioDetails } from '@/components/trades/PortfolioDetails'

type Trade = {
  id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  quantity: number
  status: 'open' | 'closed'
  created_at: string
  stop_loss: number | null
  take_profit: number | null
  notes: string | null
  strategy_id: string | null
  portfolio_id: string
  strategies?: {
    name: string
  }
}

export default function TradePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedTrade, setEditedTrade] = useState<Partial<Trade>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchTrade() {
      if (!user?.id || !params.id) return

      try {
        const { data, error } = await supabase
          .from('trades')
          .select(`
            *,
            strategies (
              name
            )
          `)
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setTrade(data)
        setEditedTrade(data)
      } catch (error) {
        console.error('Error fetching trade:', error)
        toast.error('Failed to load trade')
        router.push('/trades')
      } finally {
        setLoading(false)
      }
    }

    fetchTrade()
  }, [user?.id, params.id, router])

  const validateTradeData = () => {
    if (editedTrade.exit_price && editedTrade.exit_price <= 0) {
      toast.error('Exit price must be greater than 0')
      return false
    }
    if (editedTrade.stop_loss && editedTrade.stop_loss <= 0) {
      toast.error('Stop loss must be greater than 0')
      return false
    }
    if (editedTrade.take_profit && editedTrade.take_profit <= 0) {
      toast.error('Take profit must be greater than 0')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!trade?.id || saving) return
    if (!validateTradeData()) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('trades')
        .update({
          exit_price: editedTrade.exit_price,
          stop_loss: editedTrade.stop_loss,
          take_profit: editedTrade.take_profit,
          notes: editedTrade.notes,
          status: editedTrade.exit_price ? 'closed' : 'open'
        })
        .eq('id', trade.id)

      if (error) throw error

      setTrade({ ...trade, ...editedTrade })
      setEditing(false)
      toast.success('Trade updated successfully')
    } catch (error) {
      console.error('Error updating trade:', error)
      toast.error('Failed to update trade')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!trade?.id || !confirm('Are you sure you want to delete this trade? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', trade.id)

      if (error) throw error

      toast.success('Trade deleted successfully')
      router.push('/trades')
    } catch (error) {
      console.error('Error deleting trade:', error)
      toast.error('Failed to delete trade')
    }
  }

  const handleCancel = () => {
    setEditedTrade(trade || {})
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="container mx-auto p-6">
        <p>Trade not found</p>
      </div>
    )
  }

  const pnl = trade.exit_price
    ? (trade.exit_price - trade.entry_price) * trade.quantity * (trade.side === 'long' ? 1 : -1)
    : 0

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Trade Details</h1>
        <div className="space-x-2">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trade Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{trade.symbol}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    trade.side === 'long'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {trade.side.toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    trade.status === 'open'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {trade.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Entry Price</Label>
              <p className="text-lg">${trade.entry_price}</p>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <p className="text-lg">{trade.quantity}</p>
            </div>

            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="exit_price">Exit Price</Label>
                  <Input
                    id="exit_price"
                    type="number"
                    step="0.01"
                    value={editedTrade.exit_price || ''}
                    onChange={e =>
                      setEditedTrade({ ...editedTrade, exit_price: parseFloat(e.target.value) })
                    }
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <>
                {trade.exit_price && (
                  <div className="space-y-2">
                    <Label>Exit Price</Label>
                    <p className="text-lg">${trade.exit_price}</p>
                  </div>
                )}
              </>
            )}

            {trade.exit_price && (
              <div className="space-y-2">
                <Label>P&L</Label>
                <p className={`text-lg ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${pnl.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Strategy</Label>
              <p className="text-lg">{trade.strategies?.name || 'No strategy'}</p>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <p className="text-lg">
                {new Date(trade.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              {editing ? (
                <Textarea
                  id="notes"
                  value={editedTrade.notes || ''}
                  onChange={e => setEditedTrade({ ...editedTrade, notes: e.target.value })}
                  placeholder="Add your trade notes here..."
                  className="min-h-[100px]"
                  disabled={saving}
                />
              ) : (
                <p className="text-lg whitespace-pre-wrap">{trade.notes || 'No notes'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {trade.portfolio_id && (
        <div className="mt-6">
          <PortfolioDetails portfolioId={trade.portfolio_id} />
        </div>
      )}
    </div>
  )
} 