export type MonthlyPerformance = {
  month: string
  pnl: number
}

export type StrategyPerformance = {
  strategy: string
  winRate: number
  pnl: number
}

export type AnalyticsData = {
  winRate: { current: number; change: number }
  profitFactor: { current: number; change: number }
  averageRR: { current: number; change: number }
  totalPnL: { current: number; change: number }
  monthlyPerformance: MonthlyPerformance[]
  strategyPerformance: StrategyPerformance[]
} 