'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { analyticsService } from '@/lib/services/analyticsService'
import { Charts } from './components/Charts'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<{
    keyMetrics: any
    monthlyPerformance: any[]
    strategyPerformance: any[]
  }>({
    keyMetrics: null,
    monthlyPerformance: [],
    strategyPerformance: []
  })

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user?.id) return

      try {
        setLoading(true)
        const [keyMetrics, monthlyPerformance, strategyPerformance] = await Promise.all([
          analyticsService.getKeyMetrics(user.id),
          analyticsService.getMonthlyPerformance(user.id),
          analyticsService.getStrategyPerformance(user.id)
        ])

        setAnalyticsData({
          keyMetrics,
          monthlyPerformance,
          strategyPerformance
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user?.id])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Charts
        keyMetrics={analyticsData.keyMetrics}
        monthlyPerformance={analyticsData.monthlyPerformance}
        strategyPerformance={analyticsData.strategyPerformance}
      />
    </div>
  )
} 