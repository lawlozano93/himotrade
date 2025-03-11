'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tradeService } from '@/lib/services/tradeService'
import { authService } from '@/lib/services/authService'
import { Trade } from '@/lib/types'

type FormData = {
  symbol: string
  entry_price: string
  quantity: string
  side: Trade['side']
  strategy_id: string
  entry_date: string
  exit_date: string | null
  exit_price: string | null
  stop_loss: string
  take_profit: string
  notes: string
  risk_reward_ratio: string
  status: 'open' | 'closed'
  asset_type: Trade['asset_type']
  market: Trade['market']
}

export function TradeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    symbol: '',
    entry_price: '',
    quantity: '',
    side: 'long',
    strategy_id: '',
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: null,
    exit_price: null,
    stop_loss: '',
    take_profit: '',
    notes: '',
    risk_reward_ratio: '',
    status: 'open',
    asset_type: 'stocks',
    market: 'PH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      await tradeService.createTrade({
        user_id: user.id,
        symbol: formData.symbol,
        side: formData.side,
        entry_price: parseFloat(formData.entry_price),
        quantity: parseFloat(formData.quantity),
        strategy_id: formData.strategy_id,
        entry_date: new Date(formData.entry_date).toISOString(),
        exit_date: null,
        exit_price: null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        risk_reward_ratio: formData.risk_reward_ratio ? parseFloat(formData.risk_reward_ratio) : null,
        notes: formData.notes || null,
        status: formData.status,
        pnl: null,
        asset_type: formData.asset_type,
        market: formData.market
      })

      router.push('/trades')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_type">Asset Type</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value: Trade['asset_type']) => {
                  setFormData(prev => ({
                    ...prev,
                    asset_type: value,
                    market: value === 'stocks' ? 'PH' : null
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.asset_type === 'stocks' && (
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select
                  value={formData.market || undefined}
                  onValueChange={(value: 'US' | 'PH') => setFormData(prev => ({ ...prev, market: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PH">PH Market</SelectItem>
                    <SelectItem value="US">US Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy_id">Strategy ID</Label>
              <Input
                id="strategy_id"
                name="strategy_id"
                value={formData.strategy_id}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price</Label>
              <Input
                id="entry_price"
                name="entry_price"
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss</Label>
              <Input
                id="stop_loss"
                name="stop_loss"
                type="number"
                step="0.01"
                value={formData.stop_loss}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                name="take_profit"
                type="number"
                step="0.01"
                value={formData.take_profit}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <Select
                value={formData.side}
                onValueChange={(value: Trade['side']) => setFormData(prev => ({ ...prev, side: value }))}
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'open' | 'closed') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_date">Entry Date</Label>
            <Input
              id="entry_date"
              name="entry_date"
              type="datetime-local"
              value={formData.entry_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk_reward_ratio">Risk:Reward Ratio</Label>
            <Input
              id="risk_reward_ratio"
              name="risk_reward_ratio"
              type="number"
              step="0.01"
              value={formData.risk_reward_ratio}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Trade'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 