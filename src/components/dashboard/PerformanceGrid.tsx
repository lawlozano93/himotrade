'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  Row,
} from "@tanstack/react-table"
import { useState } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DataTable } from '@/components/ui/data-table'
import { StrategyMetrics, MonthlyMetrics } from '@/lib/services/performanceService'

interface PerformanceGridProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
}

export function PerformanceGrid<TData>({ data, columns }: PerformanceGridProps<TData>) {
  return <DataTable columns={columns} data={data} />
}

export const strategyColumns: ColumnDef<StrategyMetrics>[] = [
  {
    accessorKey: 'name',
    header: 'Strategy',
  },
  {
    accessorKey: 'totalTrades',
    header: 'Total Trades',
  },
  {
    accessorKey: 'winRate',
    header: 'Win Rate',
    cell: ({ row }) => {
      const value = row.getValue('winRate') as number
      return `${(value * 100).toFixed(2)}%`
    },
  },
  {
    accessorKey: 'profitFactor',
    header: 'Profit Factor',
    cell: ({ row }) => {
      const value = row.getValue('profitFactor') as number
      return value.toFixed(2)
    },
  },
  {
    accessorKey: 'averageRR',
    header: 'Avg R:R',
    cell: ({ row }) => {
      const value = row.getValue('averageRR') as number
      return value.toFixed(2)
    },
  },
  {
    accessorKey: 'netPnL',
    header: 'Net P&L',
    cell: ({ row }) => {
      const value = row.getValue('netPnL') as number
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PHP',
      }).format(value)
    },
  },
]

export const monthlyColumns: ColumnDef<MonthlyMetrics>[] = [
  {
    accessorKey: 'month',
    header: 'Month',
    cell: ({ row }) => {
      const date = new Date(row.getValue('month'))
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },
  },
  {
    accessorKey: 'totalTrades',
    header: 'Total Trades',
  },
  {
    accessorKey: 'winRate',
    header: 'Win Rate',
    cell: ({ row }) => {
      const value = row.getValue('winRate') as number
      return `${(value * 100).toFixed(2)}%`
    },
  },
  {
    accessorKey: 'profitFactor',
    header: 'Profit Factor',
    cell: ({ row }) => {
      const value = row.getValue('profitFactor') as number
      return value.toFixed(2)
    },
  },
  {
    accessorKey: 'netPnL',
    header: 'Net P&L',
    cell: ({ row }) => {
      const value = row.getValue('netPnL') as number
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PHP',
      }).format(value)
    },
  },
  {
    accessorKey: 'drawdown',
    header: 'Max Drawdown',
    cell: ({ row }) => {
      const value = row.getValue('drawdown') as number
      return `${(value * 100).toFixed(2)}%`
    },
  },
] 