'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

// Define our own interface since the imported one has incorrect types
interface TradeHistoryAction {
  id: string
  trade_id: string
  action_type: string
  details: Record<string, any>
  created_at: string
}

interface TradeHistoryProps {
  tradeId: string
  refreshHistoryKey?: number
}

const actionTypeLabels: Record<string, string> = {
  open: 'Opened Trade',
  close: 'Closed Trade',
  add_position: 'Added to Position',
  reduce_position: 'Reduced Position',
  add_remark: 'Added Remark',
  add_image: 'Added Image'
}

export function TradeHistory({ tradeId, refreshHistoryKey = 0 }: TradeHistoryProps) {
  const [history, setHistory] = useState<TradeHistoryAction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadHistory()
  }, [tradeId, refreshHistoryKey])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      console.log('Loaded trade history for trade ID:', tradeId, data);
      
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading trade history:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get the appropriate label for an action
  const getActionLabel = (action: TradeHistoryAction) => {
    // Check if this is a partial sell action
    if (action.action_type === 'reduce_position' && 
        action.details && 
        action.details.action === 'partial_sell') {
      return 'Partial Sell'
    }
    
    // Check if this is an add position action
    if (action.action_type === 'add_position') {
      return 'Added to Position'
    }
    
    // Otherwise use the standard label
    return actionTypeLabels[action.action_type] || action.action_type
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-1/2 bg-muted rounded"></div>
            <div className="h-4 w-2/3 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No history available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trade History</CardTitle>
        <button 
          onClick={() => loadHistory()} 
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </CardHeader>
      <CardContent>
        <div className="relative pl-4 space-y-4">
          {history.map((action, index) => (
            <div key={action.id} className="relative">
              {/* Timeline line */}
              {index < history.length - 1 && (
                <div className="absolute left-0 top-6 w-0.5 h-full -ml-2 bg-border" />
              )}
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary -ml-3" />
              <div className="pl-4">
                <h4 className="text-sm font-medium">{getActionLabel(action)}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(action.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                {action.details && Object.keys(action.details).length > 0 && (
                  <div className="mt-2 text-sm">
                    {Object.entries(action.details).map(([key, value]) => (
                      // Skip displaying the 'action' field since we use it for the label
                      key !== 'action' ? (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>
                            {value === null || value === "null" ? '' : 
                              typeof value === 'number' ? Number(value).toFixed(2) : String(value)}
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 