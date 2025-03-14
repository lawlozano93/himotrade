export type Trade = {
  id: string
  created_at: string
  user_id: string
  symbol: string
  entry_price: number
  exit_price: number | null
  quantity: number
  side: 'long' | 'short'
  status: 'open' | 'closed'
  strategy: string
  entry_date: string
  exit_date: string | null
  notes: string | null
  risk_reward_ratio: number | null
  pnl: number | null
}

export type Profile = {
  id: string
  created_at: string
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  trading_style: string | null
  preferred_timeframe: string | null
  first_name: string | null
  last_name: string | null
  birthday: string | null
  updated_at: string | null
}

export type Strategy = {
  id: string
  created_at: string
  user_id: string
  name: string
  description: string | null
  win_rate: number | null
  profit_factor: number | null
  average_rr: number | null
  total_trades: number
  total_pnl: number
} 