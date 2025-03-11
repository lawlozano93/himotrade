export type Trade = {
  id: string
  user_id: string
  symbol: string
  type: 'stocks' | 'forex' | 'crypto'
  market: 'US' | 'PH'
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  current_price: number | null
  quantity: number
  strategy: { name: string } | null
  status: 'open' | 'closed'
  pnl: number | null
  notes: string | null
  created_at: string
  asset_type: 'stocks' | 'forex' | 'crypto'
  date: string
}

export type TradeResponse = {
  id: string
  user_id: string
  symbol: string
  type: 'stocks' | 'forex' | 'crypto'
  market: 'US' | 'PH'
  side: string
  entry_price: number
  exit_price: number | null
  current_price: number | null
  quantity: number
  strategy: string
  status: string
  pnl: number | null
  notes: string | null
  created_at: string
  asset_type: 'stocks' | 'forex' | 'crypto'
  date: string
} 