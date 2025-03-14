import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Portfolio, PortfolioTransaction, PortfolioSnapshot } from '@/lib/types/index'

export const portfolioService = {
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    const supabase = createClientComponentClient()
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createPortfolio(
    userId: string,
    portfolioOrName: string | Omit<Portfolio, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    initialBalance?: number,
    currency?: string
  ): Promise<Portfolio> {
    const supabase = createClientComponentClient()
    
    // Determine if we're using the string version or the portfolio object version
    let insertData: any;
    
    if (typeof portfolioOrName === 'string') {
      // It's the (userId, name, initialBalance, currency) version
      insertData = {
        user_id: userId,
        name: portfolioOrName,
        currency: currency || 'PHP',
        initial_balance: initialBalance,
        current_balance: initialBalance,
        available_cash: initialBalance,
        equity_value: initialBalance, // Add equity_value
        total_deposits: initialBalance,
        total_withdrawals: 0,
        realized_pnl: 0
      };
    } else {
      // It's the (userId, portfolioObject) version
      const portfolio = portfolioOrName;
      insertData = {
        user_id: userId,
        name: portfolio.name,
        currency: portfolio.currency,
        initial_balance: portfolio.initial_balance,
        current_balance: portfolio.initial_balance,
        available_cash: portfolio.initial_balance,
        equity_value: portfolio.initial_balance, // Add equity_value
        total_deposits: portfolio.initial_balance,
        total_withdrawals: 0,
        realized_pnl: 0
      };
    }
    
    const { data, error } = await supabase
      .from('portfolios')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating portfolio in service:', error)
      throw error
    }
    return data
  },

  async updatePortfolioAfterTrade(
    portfolioId: string,
    tradeAmount: number,
    isClosing: boolean
  ): Promise<void> {
    const supabase = createClientComponentClient()
    const { data: portfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single()

    if (fetchError) throw fetchError

    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        available_cash: isClosing
          ? portfolio.available_cash + tradeAmount
          : portfolio.available_cash - tradeAmount
      })
      .eq('id', portfolioId)

    if (updateError) throw updateError
  },

  async validateTradeAmount(portfolioId: string, tradeAmount: number): Promise<boolean> {
    const supabase = createClientComponentClient()
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select('available_cash')
      .eq('id', portfolioId)
      .single()

    if (error) throw error
    console.log(`Validating trade amount: ${tradeAmount} against available cash: ${portfolio.available_cash}`)
    return portfolio.available_cash >= tradeAmount
  },

  async getTransactions(portfolioId: string): Promise<PortfolioTransaction[]> {
    const supabase = createClientComponentClient()
    const { data, error } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createTransaction(
    portfolioId: string,
    transaction: Omit<PortfolioTransaction, 'id' | 'created_at' | 'portfolio_id'>
  ): Promise<void> {
    const supabase = createClientComponentClient()
    const { error } = await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolioId,
        ...transaction
      })

    if (error) throw error

    // Update portfolio balance
    const { data: portfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single()

    if (fetchError) throw fetchError

    // For withdrawals, transaction.amount is already negative, so we add it
    // For deposits, transaction.amount is positive, so we add it
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        current_balance: portfolio.current_balance + transaction.amount,
        available_cash: portfolio.available_cash + transaction.amount,
        total_deposits:
          transaction.type === 'deposit'
            ? portfolio.total_deposits + Math.abs(transaction.amount)
            : portfolio.total_deposits,
        total_withdrawals:
          transaction.type === 'withdrawal'
            ? portfolio.total_withdrawals + Math.abs(transaction.amount)
            : portfolio.total_withdrawals
      })
      .eq('id', portfolioId)

    if (updateError) throw updateError
  },

  async addTransaction(
    portfolioId: string,
    type: 'deposit' | 'withdrawal',
    amount: number,
    notes?: string
  ): Promise<void> {
    const adjustedAmount = type === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount)
    
    return this.createTransaction(
      portfolioId,
      {
        amount: adjustedAmount,
        type,
        notes: notes === undefined ? `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${Math.abs(adjustedAmount)}` : notes
      }
    )
  },

  async getSnapshots(
    portfolioId: string,
    startDate: string,
    endDate: string
  ): Promise<PortfolioSnapshot[]> {
    const supabase = createClientComponentClient()
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

  async createSnapshot(portfolioId: string, snapshot: Omit<PortfolioSnapshot, 'id' | 'created_at' | 'portfolio_id'>) {
    const supabase = createClientComponentClient()
    const { error } = await supabase
      .from('portfolio_snapshots')
      .insert({
        portfolio_id: portfolioId,
        ...snapshot
      })

    if (error) throw error
  },
} 