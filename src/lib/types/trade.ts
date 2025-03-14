export interface Trade {
  id: string
  user_id: string
  portfolio_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  quantity: number
  status: 'open' | 'closed'
  entry_date: string
  pnl: number | null
  unrealized_pnl: number | null
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  initial_balance: number
  current_balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface TradeRemark {
  id: string
  trade_id: string
  content: string
  created_at: string
}

export interface TradeImage {
  id: string
  trade_id: string
  url: string
  caption: string | null
  created_at: string
}

export interface TradeHistory {
  id: string
  trade_id: string
  action_type: 'open' | 'close' | 'adjust_stop_loss' | 'adjust_take_profit' | 'add_position' | 'reduce_position' | 'add_remark' | 'add_image'
  details: Record<string, any>
  created_at: string
}

export type TradeResponse = {
  id: string
  user_id: string
  portfolio_id: string
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
  unrealized_pnl: number | null
  notes: string | null
  created_at: string
  asset_type: 'stocks' | 'forex' | 'crypto'
  entry_date: string
  exit_date: string | null
  risk_reward_ratio: number | null
  remarks?: TradeRemark[]
  images?: TradeImage[]
  history?: TradeHistory[]
} 