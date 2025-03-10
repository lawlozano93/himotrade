import { supabase } from './supabase'
import { Trade } from '@/types/database'

type KeyMetrics = {
  winRate: { current: number; change: number }
  profitFactor: { current: number; change: number }
  averageRR: { current: number; change: number }
  totalPnL: { current: number; change: number }
}

type MonthlyPerformance = {
  month: string
  pnl: number
}

type StrategyPerformance = {
  strategy: string
  pnl: number
  winRate: number
  trades: number
}

export const analyticsService = {
  async getKeyMetrics(userId: string): Promise<KeyMetrics> {
    // Get closed trades for the current month
    const currentDate = new Date()
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    // Get closed trades for the previous month
    const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

    // Get current month's trades
    const { data: currentTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('exit_date', firstDayOfMonth.toISOString())
      .lte('exit_date', lastDayOfMonth.toISOString())

    // Get last month's trades
    const { data: lastMonthTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('exit_date', firstDayOfLastMonth.toISOString())
      .lte('exit_date', lastDayOfLastMonth.toISOString())

    const currentMonthMetrics = calculateMetrics(currentTrades || [])
    const lastMonthMetrics = calculateMetrics(lastMonthTrades || [])

    return {
      winRate: {
        current: currentMonthMetrics.winRate,
        change: currentMonthMetrics.winRate - lastMonthMetrics.winRate
      },
      profitFactor: {
        current: currentMonthMetrics.profitFactor,
        change: currentMonthMetrics.profitFactor - lastMonthMetrics.profitFactor
      },
      averageRR: {
        current: currentMonthMetrics.averageRR,
        change: currentMonthMetrics.averageRR - lastMonthMetrics.averageRR
      },
      totalPnL: {
        current: currentMonthMetrics.totalPnL,
        change: currentMonthMetrics.totalPnL - lastMonthMetrics.totalPnL
      }
    }
  },

  async getMonthlyPerformance(userId: string): Promise<MonthlyPerformance[]> {
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('exit_date', { ascending: true })

    if (!trades) return []

    const monthlyPnL = trades.reduce((acc: Record<string, number>, trade) => {
      const month = new Date(trade.exit_date).toISOString().slice(0, 7) // YYYY-MM format
      const pnl = calculateTradePnL(trade)
      acc[month] = (acc[month] || 0) + pnl
      return acc
    }, {})

    return Object.entries(monthlyPnL).map(([month, pnl]) => ({
      month,
      pnl
    }))
  },

  async getStrategyPerformance(userId: string): Promise<StrategyPerformance[]> {
    const { data: trades } = await supabase
      .from('trades')
      .select(`
        *,
        strategies (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'closed')

    if (!trades) return []

    const strategyStats = trades.reduce((acc: Record<string, any>, trade) => {
      const strategyName = trade.strategies?.name || 'Unknown'
      
      if (!acc[strategyName]) {
        acc[strategyName] = {
          wins: 0,
          totalTrades: 0,
          pnl: 0
        }
      }

      const pnl = calculateTradePnL(trade)
      acc[strategyName].totalTrades++
      acc[strategyName].pnl += pnl
      if (pnl > 0) acc[strategyName].wins++

      return acc
    }, {})

    return Object.entries(strategyStats).map(([strategy, stats]: [string, any]) => ({
      strategy,
      pnl: stats.pnl,
      winRate: (stats.wins / stats.totalTrades) * 100,
      trades: stats.totalTrades
    }))
  }
}

function calculateTradePnL(trade: any): number {
  if (!trade.exit_price) return 0
  
  const direction = trade.side === 'long' ? 1 : -1
  const pnl = direction * (trade.exit_price - trade.entry_price) * trade.quantity
  return Number(pnl.toFixed(2))
}

function calculateMetrics(trades: any[]) {
  if (trades.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      averageRR: 0,
      totalPnL: 0
    }
  }

  let wins = 0
  let totalPnL = 0
  let totalProfit = 0
  let totalLoss = 0
  let totalRR = 0

  trades.forEach(trade => {
    const pnl = calculateTradePnL(trade)
    totalPnL += pnl

    if (pnl > 0) {
      wins++
      totalProfit += pnl
    } else {
      totalLoss += Math.abs(pnl)
    }

    if (trade.stop_loss && trade.take_profit) {
      const risk = Math.abs(trade.entry_price - trade.stop_loss)
      const reward = Math.abs(trade.take_profit - trade.entry_price)
      totalRR += reward / risk
    }
  })

  return {
    winRate: (wins / trades.length) * 100,
    profitFactor: totalLoss === 0 ? totalProfit : totalProfit / totalLoss,
    averageRR: totalRR / trades.length,
    totalPnL
  }
} 