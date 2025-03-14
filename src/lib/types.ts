export interface Portfolio {
  id: string
  user_id: string
  name: string
  initial_balance: number
  available_cash: number
  created_at?: string
  updated_at?: string
}

export interface Trade {
  id: string
  portfolio_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price?: number
  quantity: number
  entry_date: string
  exit_date?: string
  status: 'open' | 'closed'
  notes?: string
  pnl?: number
  current_price?: number
  strategy?: string
  remarks?: string[]
  images?: string[]
}

export interface TradeRemark {
  id: string
  trade_id: string
  content: string
  created_at: string
  updated_at?: string
}

export interface TradeImage {
  id: string
  trade_id: string
  url: string
  created_at: string
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