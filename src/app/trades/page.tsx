'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/services/supabase'
import { seedData } from '@/lib/utils/seed-data'
import { Trade } from '@/lib/types'
import { PlusCircle } from 'lucide-react'

export default function TradesPage() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrades()
  }, [])

  const loadTrades = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .order('entry_date', { ascending: false })

      if (error) throw error

      setTrades(trades || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedData = async () => {
    try {
      setSeeding(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const result = await seedData(session.user.id)
      if (!result.success) {
        throw result.error
      }

      await loadTrades()
    } catch (err) {
      console.error('Seeding error:', err)
      if (err instanceof Error) {
        setError(`Failed to seed data: ${err.message}`)
      } else if (typeof err === 'object' && err !== null) {
        setError(`Failed to seed data: ${JSON.stringify(err)}`)
      } else {
        setError('Failed to seed data: Unknown error')
      }
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return <div className="container py-8">Loading...</div>
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trades</h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleSeedData}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Test Data'}
          </Button>
          <Button asChild>
            <Link href="/trades/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Trade
            </Link>
          </Button>
        </div>
      </div>

      {trades.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>No trades found. Create a new trade or seed test data.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trades.map((trade) => (
            <Card key={trade.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{trade.symbol}</span>
                  <span className={trade.side === 'long' ? 'text-green-500' : 'text-red-500'}>
                    {trade.side.toUpperCase()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Entry Price</div>
                    <div className="font-medium">${trade.entry_price}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Exit Price</div>
                    <div className="font-medium">${trade.exit_price || 'Open'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Quantity</div>
                    <div className="font-medium">{trade.quantity}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{trade.status}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 