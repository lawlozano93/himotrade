import { supabase } from './supabase'

export type Portfolio = {
  id: string
  name: string
  currency: string
  initial_balance: number
  current_balance: number
  available_cash: number
  total_deposits: number
  total_withdrawals: number
  realized_pnl: number
  created_at: string
  updated_at: string
}

export type PortfolioSnapshot = {
  total_value: number
  cash_value: number
  equity_value: number
  realized_pnl: number
  unrealized_pnl: number
  snapshot_date: string
}

export type PortfolioTransaction = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  notes?: string
  created_at: string
}

export const portfolioService = {
  async createPortfolio(userId: string, name: string, initialBalance: number, currency: string = 'PHP') {
    const { data, error } = await supabase
      .from('portfolios')
      .insert([{
        user_id: userId,
        name,
        currency,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        available_cash: initialBalance
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getPortfolios(userId: string) {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPortfolio(portfolioId: string) {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single()

    if (error) throw error
    return data
  },

  async addTransaction(portfolioId: string, type: 'deposit' | 'withdrawal', amount: number, notes?: string) {
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single()

    if (!portfolio) throw new Error('Portfolio not found')

    const { error: transactionError } = await supabase
      .from('portfolio_transactions')
      .insert([{
        portfolio_id: portfolioId,
        type,
        amount,
        notes
      }])

    if (transactionError) throw transactionError

    // Update portfolio balances
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        current_balance: type === 'deposit' 
          ? portfolio.current_balance + amount 
          : portfolio.current_balance - amount,
        available_cash: type === 'deposit'
          ? portfolio.available_cash + amount
          : portfolio.available_cash - amount,
        total_deposits: type === 'deposit'
          ? portfolio.total_deposits + amount
          : portfolio.total_deposits,
        total_withdrawals: type === 'withdrawal'
          ? portfolio.total_withdrawals + amount
          : portfolio.total_withdrawals
      })
      .eq('id', portfolioId)

    if (updateError) throw updateError
  },

  async getTransactions(portfolioId: string) {
    const { data, error } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getSnapshots(portfolioId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true })

    if (error) throw error
    return data
  },

  async createSnapshot(portfolioId: string, snapshot: Omit<PortfolioSnapshot, 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('portfolio_snapshots')
      .insert([{
        portfolio_id: portfolioId,
        ...snapshot
      }])

    if (error) throw error
  }
} 