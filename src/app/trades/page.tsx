'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/services/supabase'
import { toast } from 'sonner'
import { NewTradeModal } from '@/components/trades/NewTradeModal'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCurrentPrice } from '@/lib/services/priceService'
import { cn } from '@/lib/utils'
import TradeDetailsSheet from "@/components/trades/TradeDetailsModal"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Trade, TradeResponse } from '@/lib/types/trade'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { NewTradeForm } from "@/components/trades/NewTradeForm"
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
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calculatePnL(entryPrice: number, currentPrice: number | null, quantity: number, side: string): string {
  if (!currentPrice) return '-'
  const pnl = side === 'Long' 
    ? (currentPrice - entryPrice) * quantity
    : (entryPrice - currentPrice) * quantity
  return formatCurrency(pnl)
}

function getPnLColor(pnl: string): string {
  if (pnl === '-') return ''
  const numericValue = parseFloat(pnl.replace(/[^0-9.-]+/g, ''))
  return numericValue > 0 ? 'text-green-600' : numericValue < 0 ? 'text-red-600' : ''
}

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }: { row: any }) => new Date(row.getValue("created_at")).toLocaleDateString(),
  },
  {
    accessorKey: "symbol",
    header: "Symbol",
  },
  {
    accessorKey: "side",
    header: "Side",
    cell: ({ row }: { row: any }) => <span className="capitalize">{row.getValue("side")}</span>,
  },
  {
    accessorKey: "entry_price",
    header: "Entry Price",
    cell: ({ row }: { row: any }) => formatCurrency(row.getValue("entry_price")),
  },
  {
    accessorKey: "current_price",
    header: "Current Price",
    cell: ({ row }: { row: any }) => {
      const trade = row.original
      if (trade.status === 'closed') {
        return trade.pnl ? formatCurrency(trade.pnl) : '-'
      }
      return trade.current_price ? formatCurrency(trade.current_price) : '-'
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "strategy",
    header: "Strategy",
    cell: ({ row }: { row: any }) => row.original.strategy?.name || '-',
  },
  {
    id: "pnl",
    header: "P&L",
    cell: ({ row }: { row: any }) => {
      const trade = row.original
      const pnl = calculatePnL(trade.entry_price, trade.current_price, trade.quantity, trade.side)
      return (
        <span className={getPnLColor(pnl)}>
          {pnl}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any }) => <span className="capitalize">{row.getValue("status")}</span>,
  },
]

function DataTable({
  data,
  columns,
  onRowClick,
}: {
  data: Trade[]
  columns: ColumnDef<Trade>[]
  onRowClick: (trade: Trade) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter symbols..."
          value={(table.getColumn("symbol")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("symbol")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No trades found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function TradesPage() {
  const { user } = useUser()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('open')
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const supabaseClient = createClientComponentClient()
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)

  const fetchTrades = () => {
    setLoading(true)
    console.log('[Trades] Starting to fetch trades...')
    
    supabaseClient.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          console.log('[Trades] No user found')
          setLoading(false)
          return
        }

        console.log('[Trades] User found, fetching trades...')
        return supabaseClient
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('market', 'PH')  // Only fetch PH market trades
          .order('created_at', { ascending: false })
      })
      .then((result) => {
        if (!result) return

        const { data: trades, error } = result
        if (error) {
          console.error('[Trades] Error fetching trades:', error)
          return
        }

        console.log('[Trades] Raw trades data:', trades)
        
        if (!trades || trades.length === 0) {
          console.log('[Trades] No trades found')
          setTrades([])
          return
        }
        
        const formattedTrades = (trades as TradeResponse[]).map(trade => ({
          ...trade,
          side: (trade.side || 'long').toLowerCase() as 'long' | 'short',
          status: (trade.status || 'open').toLowerCase() as 'open' | 'closed',
          strategy: trade.strategy ? { name: trade.strategy } : null,
          asset_type: trade.type,
          current_price: trade.current_price
        })) as Trade[]
        
        console.log('[Trades] Formatted trades:', formattedTrades)
        setTrades(formattedTrades)
        updateCurrentPrices(formattedTrades)
      })
      .catch((error: Error) => {
        console.error('[Trades] Unexpected error:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const updateCurrentPrices = (trades: Trade[]) => {
    if (!trades.length) {
      console.log('[Trades] No trades to update prices for')
      return
    }

    console.log('[Trades] Starting to update prices for trades:', trades)
    setUpdatingPrices(true)
    const updatedTrades = [...trades]
    
    Promise.all(
      updatedTrades.map(async (trade) => {
        if (trade.status === 'closed') {
          console.log(`[Trades] Skipping closed trade ${trade.symbol}`)
          return trade
        }

        try {
          console.log(`[Trades] Fetching price for ${trade.symbol}...`)
          const priceData = await getCurrentPrice(trade.symbol, 'stocks', 'PH')
          console.log(`[Trades] Received price for ${trade.symbol}:`, priceData)
          
          if (priceData) {
            trade.current_price = priceData.price
            console.log(`[Trades] Updated price for ${trade.symbol} to ${priceData.price}`)
          }
        } catch (error) {
          console.error(`[Trades] Error updating price for ${trade.symbol}:`, error)
        }
        return trade
      })
    ).then((updatedTradesWithPrices) => {
      console.log('[Trades] All prices updated:', updatedTradesWithPrices)
      setTrades(updatedTradesWithPrices)
      setUpdatingPrices(false)
    })
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  // Filter trades based on status
  const openTrades = trades.filter(trade => trade.status === 'open')
  const closedTrades = trades.filter(trade => trade.status === 'closed')

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-end items-center mb-8">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Trade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Trade</DialogTitle>
            </DialogHeader>
            <NewTradeForm onSuccess={() => {
              fetchTrades()
              const dialogClose = document.querySelector('[data-state="open"] button[aria-label="Close"]') as HTMLButtonElement
              if (dialogClose) dialogClose.click()
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="open" className="relative">
              Open Trades
              {openTrades.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {openTrades.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed" className="relative">
              Trade History
              {closedTrades.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                  {closedTrades.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-4">Loading trades...</div>
                ) : (
                  <DataTable
                    data={openTrades}
                    columns={columns}
                    onRowClick={setSelectedTrade}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-4">Loading trades...</div>
                ) : (
                  <DataTable
                    data={closedTrades}
                    columns={columns}
                    onRowClick={setSelectedTrade}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedTrade && (
        <TradeDetailsSheet
          trade={selectedTrade}
          isOpen={!!selectedTrade}
          setIsOpen={(open) => {
            if (!open) setSelectedTrade(null)
          }}
        />
      )}
    </div>
  )
} 