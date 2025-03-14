import { createClient } from '@/lib/supabase/client'
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns'

export interface PerformanceMetrics {
  totalTrades: number
  totalWins: number
  winRate: number
  profitFactor: number
  averageRR: number
  maxDrawdown: number
  sharpeRatio: number
  netPnL: number
  netPnLPercentage: number
}

export interface PortfolioSnapshot {
  date: string
  totalValue: number
  cashBalance: number
  marketValue: number
  dayPnL: number
  totalPnL: number
}

export interface StrategyMetrics {
  name: string
  totalTrades: number
  winRate: number
  profitFactor: number
  totalPnL: number
}

export interface MonthlyMetrics {
  date: string
  trades: number
  winRate: number
  pnl: number
}

interface DatabasePortfolioSnapshot {
  date: string
  total_value: number
  cash_balance: number
  market_value: number
  day_pnl: number
  total_pnl: number
}

class PerformanceService {
  private supabase = createClient()

  async getPerformanceMetrics(
    startDate: Date,
    endDate: Date,
    strategyId?: string
  ): Promise<PerformanceMetrics | null> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('get_performance_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          strategy_id: strategyId || null
        })

      if (error) {
        console.error('Error fetching performance metrics:', error)
        return null
      }

      if (!metrics || metrics.length === 0) {
        return {
          totalTrades: 0,
          totalWins: 0,
          winRate: 0,
          profitFactor: 0,
          averageRR: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          netPnL: 0,
          netPnLPercentage: 0
        }
      }

      return {
        totalTrades: metrics[0].total_trades,
        totalWins: metrics[0].winning_trades,
        winRate: metrics[0].win_rate,
        profitFactor: metrics[0].profit_factor,
        averageRR: metrics[0].average_rr,
        maxDrawdown: metrics[0].max_drawdown,
        sharpeRatio: metrics[0].sharpe_ratio,
        netPnL: metrics[0].net_pnl,
        netPnLPercentage: metrics[0].net_pnl_percentage
      }
    } catch (error) {
      console.error('Error in getPerformanceMetrics:', error)
      return null
    }
  }

  async getPortfolioSnapshots(
    startDate: Date,
    endDate: Date
  ): Promise<PortfolioSnapshot[]> {
    const { data, error } = await this.supabase
      .from('portfolio_snapshots')
      .select('*')
      .gte('date', startOfDay(startDate).toISOString())
      .lte('date', endOfDay(endDate).toISOString())
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching portfolio snapshots:', error)
      return []
    }

    return (data as DatabasePortfolioSnapshot[]).map(snapshot => ({
      date: snapshot.date,
      totalValue: snapshot.total_value,
      cashBalance: snapshot.cash_balance,
      marketValue: snapshot.market_value,
      dayPnL: snapshot.day_pnl,
      totalPnL: snapshot.total_pnl
    }))
  }

  async getEquityCurve(
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; value: number }[]> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('get_equity_curve', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })

      if (error) {
        console.error('Error fetching equity curve:', error)
        return []
      }

      return metrics || []
    } catch (error) {
      console.error('Error in getEquityCurve:', error)
      return []
    }
  }

  async getStrategyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<StrategyMetrics[]> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('get_strategy_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })

      if (error) {
        console.error('Error fetching strategy metrics:', error)
        return []
      }

      return metrics || []
    } catch (error) {
      console.error('Error in getStrategyMetrics:', error)
      return []
    }
  }

  async getMonthlyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyMetrics[]> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('get_monthly_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })

      if (error) {
        console.error('Error fetching monthly metrics:', error)
        return []
      }

      return metrics || []
    } catch (error) {
      console.error('Error in getMonthlyMetrics:', error)
      return []
    }
  }

  async getTimeframeDates(timeframe: string): Promise<{ start: Date; end: Date }> {
    const end = new Date()
    let start: Date

    switch (timeframe) {
      case '1W':
        start = subDays(end, 7)
        break
      case '1M':
        start = subDays(end, 30)
        break
      case '3M':
        start = subDays(end, 90)
        break
      case '6M':
        start = subDays(end, 180)
        break
      case '1Y':
        start = subDays(end, 365)
        break
      case 'ALL':
        start = new Date(0) // Beginning of time
        break
      default:
        start = subDays(end, 30) // Default to 1 month
    }

    return { start, end }
  }
}

export const performanceService = new PerformanceService() 