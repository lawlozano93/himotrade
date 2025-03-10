export type Trade = {
  id?: string
  user_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  quantity: number
  status: 'open' | 'closed'
  strategy_id: string
  entry_date: string
  exit_date: string | null
  stop_loss: number | null
  take_profit: number | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface Profile {
  id: string
  created_at: string
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  trading_style: string | null
  preferred_timeframe: string | null
}

export type Strategy = {
  id?: string
  user_id: string
  name: string
  description: string | null
  created_at?: string
  updated_at?: string
} 