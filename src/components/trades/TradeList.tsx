'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import TradeDetails, { type TradeWithCurrentPrice } from '@/components/trades/TradeDetails'
import { AutoUpdatePrices } from '@/components/trades/AutoUpdatePrices'
import type { Trade } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { tradeService } from "@/lib/services/tradeService"
import { SortingState } from "@tanstack/react-table"

// Interface for stock prices coming from the API
interface StockPrice {
  symbol: string;
  price: number;
  source: string;
}

// Define the type for stocks from phisix API
interface PhisixStock {
  symbol: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
  percent_change: number;
  volume: number;
}

interface TradeListProps {
  portfolioId: string
  status: 'open' | 'closed'
}

export default function TradeList({ portfolioId, status }: TradeListProps) {
  const { toast } = useToast()
  const [data, setData] = useState<TradeWithCurrentPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedTrade, setSelectedTrade] = useState<TradeWithCurrentPrice | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const supabase = createClientComponentClient()

  // Memoize the loadTrades function to avoid dependency cycles
  const loadTrades = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const trades = await tradeService.getTradesWithCorrectPnLDisplay(portfolioId, status)
        console.log(`Loaded ${trades.length} ${status} trades`)
        setData(trades as TradeWithCurrentPrice[])
      } catch (error) {
        console.error("Error using getTradesWithCorrectPnLDisplay:", error)
        console.log("Falling back to original method")
        
        const { data: trades, error: tradesError } = await supabase
          .from("trade_display_view")
          .select("*")
          .eq("portfolio_id", portfolioId)
          .eq("status", status)
          .order("entry_date", { ascending: false })

        if (tradesError) {
          console.error("Error fetching trades:", tradesError.message)
          return
        }

        setData(trades as TradeWithCurrentPrice[])
      }
    } catch (error) {
      console.error('Error loading trades:', error)
      toast({
        title: 'Error',
        description: 'Failed to load trades',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [portfolioId, status, supabase, toast])

  // Special function to handle SPNEC stock issues
  const updateSPNECPrice = useCallback(async () => {
    // Only run for open trades
    if (status !== 'open') return;

    // Check if we have any SPNEC trades with missing prices
    const spnecTrades = data.filter(
      (trade) => trade.symbol === 'SPNEC' && !trade.current_price && trade.unrealized_pnl !== null && trade.unrealized_pnl !== undefined
    );

    if (spnecTrades.length === 0) return;
    
    console.log(`Found ${spnecTrades.length} SPNEC trades with missing prices but existing P&L`);
    
    try {
      // Try direct API call for SPNEC
      const response = await fetch('https://phisix-api3.appspot.com/stocks/SPNEC.json');
      
      if (response.ok) {
        const data = await response.json();
        if (data?.stock?.price?.amount) {
          const price = parseFloat(data.stock.price.amount);
          console.log(`Got SPNEC price from API: ${price}`);
          
          // Update each trade
          for (const trade of spnecTrades) {
            await supabase
              .from('trades')
              .update({ 
                current_price: price,
                updated_at: new Date().toISOString()
              })
              .eq('id', trade.id);
          }
          
          // Reload trades
          loadTrades();
        }
      } else {
        console.log('Failed to get SPNEC price from API, trying fallback');
        
        // Fallback: Try to derive price from unrealized_pnl for a long position
        // P&L = (current_price - entry_price) * quantity - fees
        // current_price = entry_price + (P&L + fees) / quantity
        
        for (const trade of spnecTrades) {
          if (trade.side === 'long' && trade.unrealized_pnl !== null) {
            // Estimate fees (simplified)
            const estimatedFees = (trade.total_fee) || 
              (trade.entry_price * trade.quantity * 0.015); // Rough estimate of total fees
            
            // Use ! to assert that unrealized_pnl is not undefined
            const derivedPrice = trade.entry_price + 
              ((trade.unrealized_pnl! + estimatedFees) / trade.quantity);
            
            console.log(`Derived SPNEC price for trade ${trade.id}: ${derivedPrice} from P&L ${trade.unrealized_pnl}`);
            
            // Update the trade with the derived price
            await supabase
              .from('trades')
              .update({ 
                current_price: parseFloat(derivedPrice.toFixed(4)),
                updated_at: new Date().toISOString()
              })
              .eq('id', trade.id);
          }
        }
        
        // Reload trades
        loadTrades();
      }
    } catch (error) {
      console.error('Error updating SPNEC price:', error);
    }
  }, [data, status, supabase, loadTrades]);

  // Load trades when portfolio ID changes
  useEffect(() => {
    if (portfolioId) {
      loadTrades()
    }
  }, [portfolioId, loadTrades])

  // Modify the useEffect for auto-refreshing prices of open trades
  
  useEffect(() => {
    // Only do this for open trades
    if (status !== 'open' || !portfolioId) return
    
    // Initial fetch when component mounts
    const fetchAllPrices = async () => {
      try {
        console.log('Auto-fetching prices for all open trades')
        
        // Get all open trades symbols with entry_price
        const { data, error } = await supabase
          .from('trades')
          .select('symbol, id, entry_price')
          .eq('portfolio_id', portfolioId)
          .eq('status', 'open')
          .order('symbol')
          
        if (error) throw error
        
        if (!data || data.length === 0) {
          console.log('No open trades found for price updates')
          return
        }
        
        // Get unique symbols
        const symbols = [...new Set(data.map(t => t.symbol))]
        console.log(`Found ${symbols.length} symbols to update prices for: ${symbols.join(', ')}`)
        
        // Fetch prices from phisix API - use api3 as primary
        const response = await fetch('https://phisix-api3.appspot.com/stocks.json')
        if (!response.ok) {
          try {
            // Fallback to phisix-api4 if api3 fails
            const fallbackResponse = await fetch('https://phisix-api4.appspot.com/stocks.json')
            if (!fallbackResponse.ok) {
              throw new Error(`Failed to fetch from both phisix APIs`)
            }
            const apiData = await fallbackResponse.json()
            if (!apiData?.stock || !Array.isArray(apiData.stock)) {
              throw new Error('Invalid data format from phisix API')
            }
            
            // Filter to just our symbols
            const matchingStocks = apiData.stock.filter((s: PhisixStock) => 
              symbols.includes(s.symbol)
            )
            
            console.log(`Found prices for ${matchingStocks.length} out of ${symbols.length} symbols`, matchingStocks)
            if (matchingStocks.length === 0) return
            
            // Insert into stock_prices and update trades
            const stockPrices = matchingStocks.map((s: PhisixStock) => ({
              symbol: s.symbol,
              price: parseFloat(s.price.amount.toString()),
              source: 'phisix-api4'
            }))
            
            // Handle stocks that didn't get prices by using their entry price
            const missingSymbols = symbols.filter(symbol => 
              !stockPrices.some((sp: StockPrice) => sp.symbol === symbol)
            );
            
            if (missingSymbols.length > 0) {
              console.log(`Using entry price as fallback for ${missingSymbols.length} symbols:`, missingSymbols);
              
              // Get trades with missing prices
              const tradesWithMissingPrices = data.filter(t => 
                missingSymbols.includes(t.symbol)
              );
              
              // Group by symbol to get one price per symbol
              const fallbackPrices: StockPrice[] = [];
              
              for (const symbol of missingSymbols) {
                // Find a trade for this symbol
                const trade = tradesWithMissingPrices.find(t => t.symbol === symbol);
                if (trade && trade.entry_price) {
                  fallbackPrices.push({
                    symbol,
                    price: trade.entry_price,
                    source: 'entry-price-fallback'
                  });
                }
              }
              
              if (fallbackPrices.length > 0) {
                console.log(`Adding ${fallbackPrices.length} fallback prices using entry prices`, fallbackPrices);
                
                // Add fallback prices to stockPrices
                stockPrices.push(...fallbackPrices);
              }
            }
            
            processStockPrices(stockPrices, data)
          } catch (fallbackError) {
            console.error('Error with fallback API:', fallbackError)
            throw new Error(`Failed to fetch from phisix API: ${response.status}`)
          }
          return
        }
        
        const apiData = await response.json()
        if (!apiData?.stock || !Array.isArray(apiData.stock)) {
          throw new Error('Invalid data format from phisix API')
        }
        
        // Filter to just our symbols
        const matchingStocks = apiData.stock.filter((s: PhisixStock) => 
          symbols.includes(s.symbol)
        )
        
        console.log(`Found prices for ${matchingStocks.length} out of ${symbols.length} symbols`, matchingStocks)
        if (matchingStocks.length === 0) {
          // Check if there's a SPNEC trade specifically and try direct API call for it
          if (symbols.includes('SPNEC')) {
            console.log('Trying direct API call for SPNEC')
            try {
              const spnecResponse = await fetch('https://phisix-api3.appspot.com/stocks/SPNEC.json')
              if (spnecResponse.ok) {
                const spnecData = await spnecResponse.json()
                if (spnecData?.stock?.price?.amount) {
                  const price = parseFloat(spnecData.stock.price.amount)
                  const spnecTrades = data.filter(t => t.symbol === 'SPNEC')
                  console.log(`Found SPNEC price: ${price} for ${spnecTrades.length} trades`)
                  
                  // Process this single stock
                  const stockPrice = {
                    symbol: 'SPNEC',
                    price: price,
                    source: 'phisix-api3-direct'
                  }
                  
                  processStockPrices([stockPrice], spnecTrades)
                }
              }
            } catch (spnecError) {
              console.error('Error fetching SPNEC directly:', spnecError)
            }
          }
          
          // Handle stocks that didn't get prices by using their entry price (for all symbols)
          const missingSymbols = symbols;
          
          if (missingSymbols.length > 0) {
            console.log(`Using entry price as fallback for ${missingSymbols.length} symbols:`, missingSymbols);
            
            // Group by symbol to get one price per symbol
            const fallbackPrices: StockPrice[] = [];
            
            for (const symbol of missingSymbols) {
              // Find a trade for this symbol
              const trade = data.find(t => t.symbol === symbol);
              if (trade && trade.entry_price) {
                fallbackPrices.push({
                  symbol,
                  price: trade.entry_price,
                  source: 'entry-price-fallback'
                });
              }
            }
            
            if (fallbackPrices.length > 0) {
              console.log(`Adding ${fallbackPrices.length} fallback prices using entry prices`, fallbackPrices);
              
              // Add fallback prices to stockPrices
              processStockPrices(fallbackPrices, data.filter(t => 
                fallbackPrices.some(fp => fp.symbol === t.symbol)
              ));
            }
          }
          return
        }
        
        // Insert into stock_prices and update trades
        const stockPrices = matchingStocks.map((s: PhisixStock) => ({
          symbol: s.symbol,
          price: parseFloat(s.price.amount.toString()),
          source: 'phisix-api3'
        }))
        
        // Handle stocks that didn't get prices by using their entry price
        const missingSymbols = symbols.filter(symbol => 
          !stockPrices.some((sp: StockPrice) => sp.symbol === symbol)
        );
        
        if (missingSymbols.length > 0) {
          console.log(`Using entry price as fallback for ${missingSymbols.length} symbols:`, missingSymbols);
          
          // Get trades with missing prices
          const tradesWithMissingPrices = data.filter(t => 
            missingSymbols.includes(t.symbol)
          );
          
          // Group by symbol to get one price per symbol
          const fallbackPrices: StockPrice[] = [];
          
          for (const symbol of missingSymbols) {
            // Find a trade for this symbol
            const trade = tradesWithMissingPrices.find(t => t.symbol === symbol);
            if (trade && trade.entry_price) {
              fallbackPrices.push({
                symbol,
                price: trade.entry_price,
                source: 'entry-price-fallback'
              });
            }
          }
          
          if (fallbackPrices.length > 0) {
            console.log(`Adding ${fallbackPrices.length} fallback prices using entry prices`, fallbackPrices);
            
            // Add fallback prices to stockPrices
            stockPrices.push(...fallbackPrices);
          }
        }
        
        processStockPrices(stockPrices, data)
      } catch (error) {
        console.error('Error auto-updating prices:', error)
      }
    }
    
    // Helper function to process stock prices
    const processStockPrices = async (stockPrices: StockPrice[], trades: any[]) => {
      try {
        // Insert prices
        const { error: insertError } = await supabase
          .from('stock_prices')
          .insert(stockPrices.map((p: StockPrice) => ({
            symbol: p.symbol,
            price: p.price,
            source: p.source
          })))
          
        if (insertError) {
          console.error('Error inserting stock prices:', insertError)
        }
        
        // Update trades
        for (const stockPrice of stockPrices) {
          const tradeIds = trades
            .filter(t => t.symbol === stockPrice.symbol)
            .map(t => t.id);
            
          if (tradeIds.length === 0) continue;
          
          console.log(`Updating current_price to ${stockPrice.price} for ${stockPrice.symbol} trades:`, tradeIds)
          
          for (const tradeId of tradeIds) {
            await supabase
              .from('trades')
              .update({ 
                current_price: stockPrice.price,
                updated_at: new Date().toISOString()
              })
              .eq('id', tradeId)
          }
        }
        
        // Update P&L calculations
        try {
          await supabase.rpc('update_all_unrealized_pnl')
        } catch (pnlError) {
          console.error('Error updating unrealized PnL:', pnlError)
        }
        
        // Reload trades to show updated prices and P&L
        loadTrades()
      } catch (processError) {
        console.error('Error processing stock prices:', processError)
      }
    }
    
    // Run on mount
    fetchAllPrices()
    
    // Set up interval for periodic updates
    const intervalId = setInterval(fetchAllPrices, 5 * 60 * 1000) // every 5 minutes
    
    return () => {
      clearInterval(intervalId)
    }
  }, [portfolioId, status, supabase, loadTrades])

  // Add to existing useEffect that runs when data changes
  useEffect(() => {
    // If we have data and we're showing open trades, check for SPNEC issues
    if (data.length > 0 && status === 'open') {
      updateSPNECPrice();
    }
  }, [data, status, updateSPNECPrice]);

  const handleTradeClick = (trade: TradeWithCurrentPrice) => {
    // Ensure the trade has all the necessary properties for the trade details
    const enhancedTrade: TradeWithCurrentPrice = {
      ...trade,
      // Use current_price if available, otherwise use entry_price
      // This ensures consistency between the table and details views
      current_price: trade.current_price || trade.entry_price,
      // Preserve the same unrealized_pnl value used in the table
      unrealized_pnl: trade.unrealized_pnl || undefined
    };
    
    setSelectedTrade(enhancedTrade);
    setShowDetails(true);
  }

  const handleTradeUpdated = () => {
    loadTrades()
  }

  const filteredData = data.filter((trade) =>
    trade.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    trade.notes?.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{status === 'open' ? 'Open Trades' : 'Closed Trades'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-[200px]" />
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5).fill(0).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'open') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Input
                placeholder="Filter symbols..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((trade) => (
                    <TableRow 
                      key={trade.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleTradeClick(trade)}
                    >
                      <TableCell>{formatDate(trade.entry_date)}</TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'long' ? 'default' : 'destructive'}>
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(trade.entry_price, '₱')}</TableCell>
                      <TableCell>
                        {trade.current_price ? 
                          formatCurrency(trade.current_price, '₱') : 
                          // If current_price is missing but we have P&L, use entry_price as fallback
                          formatCurrency(trade.entry_price, '₱')}
                      </TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>{trade.strategy || '-'}</TableCell>
                      <TableCell className={cn(
                        'font-medium',
                        (trade.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {trade.unrealized_pnl != null ? formatCurrency(trade.unrealized_pnl || 0, '₱') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>

        <TradeDetails
          trade={selectedTrade}
          open={showDetails}
          onOpenChange={setShowDetails}
          onTradeUpdated={handleTradeUpdated}
        />
      </Card>
    )
  }

  // Trade History View
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Filter symbols..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Realized P&L</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((trade) => (
                  <TableRow 
                    key={trade.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleTradeClick(trade)}
                  >
                    <TableCell>{formatDate(trade.entry_date)}</TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'long' ? 'default' : 'destructive'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(trade.entry_price, '₱')}</TableCell>
                    <TableCell>{trade.exit_price ? formatCurrency(trade.exit_price, '₱') : '-'}</TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{trade.strategy || '-'}</TableCell>
                    <TableCell className={cn(
                      'font-medium',
                      (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {trade.pnl != null ? formatCurrency(trade.pnl || 0, '₱') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <TradeDetails
        trade={selectedTrade}
        open={showDetails}
        onOpenChange={setShowDetails}
        onTradeUpdated={handleTradeUpdated}
      />
    </Card>
  )
} 