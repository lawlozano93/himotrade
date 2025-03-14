export interface Portfolio {
  id: string
  user_id: string
  name: string
  currency: string
  initial_balance: number
  available_cash: number
  current_balance: number
  created_at: string
  updated_at: string
}

export interface PortfolioSummary {
  id: string
  name: string
  available_cash: number
  currency?: string
}

export interface PortfolioSnapshot {
  id: string
  portfolio_id: string
  balance: number
  date: string
  created_at: string
}

export interface PortfolioTransaction {
  id: string
  portfolio_id: string
  amount: number
  type: 'deposit' | 'withdrawal'
  notes?: string
  created_at: string
}

export interface Trade {
  id: string
  user_id: string
  portfolio_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price?: number | null
  quantity: number
  entry_date: string
  exit_date?: string | null
  notes?: string | null
  status: 'open' | 'closed'
  pnl?: number | null
  current_price?: number | null
  strategy?: string | null
  asset_type: 'stocks' | 'forex' | 'crypto'
  market: 'PH' | 'US' | null
  created_at: string
  updated_at: string
  unrealized_pnl?: number | null
  entry_fee?: number | null
  total_fee?: number | null
}

export interface Strategy {
  id: string
  name: string
}

export interface TradeResponse extends Omit<Trade, 'strategy'> {
  strategy?: Strategy | string | null
  current_price?: number
  pnl?: number
}

export interface AuthResponse {
  data: {
    user: {
      id: string
      email: string
    } | null
  }
  error: Error | null
}

export interface TradeHistoryAction {
  id: string
  trade_id: string
  portfolio_id: string
  action_type: string
  details: string
  created_at: string
}

export interface TradeHistory {
  id: string
  trade_id: string
  actions: TradeHistoryAction[]
} 