import { supabase } from './supabase'
import { Trade } from '../types'

export const tradeService = {
  async getTrades(userId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createTrade(trade: Omit<Trade, 'id' | 'created_at'>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert([trade])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTrade(id: string): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async closeTrade(id: string, exitPrice: number): Promise<Trade> {
    const trade = await this.getTradeById(id)
    if (!trade) throw new Error('Trade not found')

    const pnl = trade.side === 'long'
      ? (exitPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - exitPrice) * trade.quantity

    return this.updateTrade(id, {
      status: 'closed',
      exit_price: exitPrice,
      exit_date: new Date().toISOString(),
      pnl
    })
  },

  async getTradeById(id: string): Promise<Trade | null> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getAnalytics(userId: string) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')

    if (error) throw error

    // Calculate analytics
    const totalTrades = data.length
    const winningTrades = data.filter(trade => trade.pnl && trade.pnl > 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const totalPnL = data.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const averageRR = data.reduce((sum, trade) => sum + (trade.risk_reward_ratio || 0), 0) / totalTrades

    return {
      winRate,
      totalPnL,
      averageRR,
      totalTrades,
      winningTrades,
    }
  }
} 