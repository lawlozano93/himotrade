'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { TradeHistory } from './TradeHistory'
import { tradeService } from '@/lib/services/tradeService'
import { calculatePnL } from '@/lib/utils/fees'
import { calculateBoardLot } from '@/lib/utils/boardLot'
import type { Trade as BaseTrade } from '@/lib/types/index'

export interface TradeWithCurrentPrice extends BaseTrade {
  current_price?: number;
  unrealized_pnl?: number | null;
  entry_fee?: number | null;
  total_fee?: number | null;
}

interface TradeDetailsProps {
  trade: TradeWithCurrentPrice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTradeUpdated: () => void;
}

export default function TradeDetails({ trade, open, onOpenChange, onTradeUpdated }: TradeDetailsProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [exitData, setExitData] = useState<{
    exit_price: string
    quantity: string
    exit_date: Date
  }>({
    exit_price: '',
    quantity: '',
    exit_date: new Date(),
  })
  const [isPartialSell, setIsPartialSell] = useState(false)
  const [partialSellPnL, setPartialSellPnL] = useState<number | null>(null)
  const [boardLotSize, setBoardLotSize] = useState<number | null>(null)
  const [suggestedQuantity, setSuggestedQuantity] = useState<number | null>(null)
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (trade?.symbol) {
      fetchCurrentPrice(trade.symbol)
      // Initialize quantity with full trade amount
      setExitData(prev => ({
        ...prev,
        quantity: trade.quantity.toString(),
        exit_date: new Date()
      }))

      // Calculate board lot size
      if (trade.entry_price) {
        const lotSize = calculateBoardLot(trade.entry_price)
        setBoardLotSize(lotSize)
        
        // Calculate suggested quantity (nearest multiple of board lot)
        if (lotSize > 0) {
          const suggested = Math.floor(trade.quantity / lotSize) * lotSize
          setSuggestedQuantity(suggested > 0 ? suggested : lotSize)
        }
      }
    }
  }, [trade])

  // Calculate P&L for partial sell
  useEffect(() => {
    if (trade?.status === 'open' && currentPrice && currentPrice > 0) {
      const calculatedPnL = calculatePnL(
        trade.entry_price,
        currentPrice,
        trade.quantity,
        trade.side
      )
      setPartialSellPnL(calculatedPnL)
    }
  }, [trade, currentPrice])

  // Update isPartialSell based on quantity
  useEffect(() => {
    if (trade && exitData.quantity) {
      const sellQty = parseFloat(exitData.quantity)
      setIsPartialSell(sellQty < trade.quantity)
    }
  }, [exitData.quantity, trade])

  // Validate quantity against board lot size
  const validateQuantity = (quantity: number): boolean => {
    if (!boardLotSize) return true;
    return quantity % boardLotSize === 0;
  }

  const fetchCurrentPrice = async (symbol: string) => {
    try {
      // For now, we'll just use the current_price if it's already in the trade object
      if (trade?.current_price) {
        setCurrentPrice(trade.current_price)
        return
      }

      // First, try to get from the database
      const { data, error } = await supabase
        .from('stock_prices')
        .select('price')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        console.log(`Found current price in database for ${symbol}: ${data.price}`)
        setCurrentPrice(data.price)
        
        // Update the trade's current_price in the database
        updateTradeCurrentPrice(symbol, data.price)
        return
      }

      console.log(`No price found in database for ${symbol}, trying phisix API...`)
      
      // Not found in DB, try to fetch from phisix API
      try {
        const response = await fetch('https://phisix-api3.appspot.com/stocks.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch from phisix API: ${response.status}`)
        }
        
        const apiData = await response.json()
        
        if (apiData?.stock && Array.isArray(apiData.stock)) {
          const stockData = apiData.stock.find((s: any) => s.symbol === symbol)
          if (stockData?.price?.amount) {
            const price = parseFloat(stockData.price.amount)
            console.log(`Found price from phisix API for ${symbol}: ${price}`)
            setCurrentPrice(price)
            
            // Store in database and update trade
            try {
              await supabase
                .from('stock_prices')
                .insert({
                  symbol,
                  price,
                  source: 'phisix-api3'
                })
              
              // Update the trade's current_price
              updateTradeCurrentPrice(symbol, price)
            } catch (dbError) {
              console.error('Error saving price to database:', dbError)
            }
            
            return
          }
        }
        
        // If we can't find the stock in the primary API response, try direct API call
        console.log(`Symbol ${symbol} not found in phisix API response, trying direct endpoint`)
        const directResponse = await fetch(`https://phisix-api3.appspot.com/stocks/${symbol}.json`)
        if (directResponse.ok) {
          const directData = await directResponse.json()
          if (directData?.stock?.price?.amount) {
            const price = parseFloat(directData.stock.price.amount)
            console.log(`Found price from direct API call for ${symbol}: ${price}`)
            setCurrentPrice(price)
            
            // Store in database and update trade
            try {
              await supabase
                .from('stock_prices')
                .insert({
                  symbol,
                  price,
                  source: 'phisix-api3-direct'
                })
              
              // Update the trade's current_price
              updateTradeCurrentPrice(symbol, price)
            } catch (dbError) {
              console.error('Error saving price to database:', dbError)
            }
            
            return
          }
        }
      } catch (apiError) {
        console.error('Error fetching from phisix API:', apiError)
      }
      
      // Fallback: Use entry price if nothing else is available
      if (trade?.entry_price) {
        console.log(`Using entry price (${trade.entry_price}) as fallback current price`)
        setCurrentPrice(trade.entry_price)
        updateTradeCurrentPrice(symbol, trade.entry_price)
      }
    } catch (error) {
      console.error('Error in fetchCurrentPrice:', error)
    }
  }
  
  // Helper function to update the trade's current_price in the database
  const updateTradeCurrentPrice = async (symbol: string, price: number) => {
    if (!trade?.id) return
    
    try {
      const { error } = await supabase
        .from('trades')
        .update({ 
          current_price: price,
          updated_at: new Date().toISOString()
        })
        .eq('id', trade.id)
      
      if (error) {
        console.error('Error updating trade current price:', error)
      } else {
        console.log(`Updated current_price for trade ${trade.id} to ${price}`)
        
        // Try to update unrealized PnL
        try {
          await supabase.rpc('update_all_unrealized_pnl')
        } catch (pnlError) {
          console.error('Failed to update unrealized PnL:', pnlError)
        }
      }
    } catch (updateError) {
      console.error('Error in updateTradeCurrentPrice:', updateError)
    }
  }

  const refreshHistory = () => {
    setRefreshHistoryKey(prev => prev + 1);
  };

  const handleCloseTrade = async () => {
    if (!trade) return
    
    try {
      setIsSubmitting(true)
      
      const exitPrice = parseFloat(exitData.exit_price)
      if (isNaN(exitPrice) || exitPrice <= 0) {
        toast({
          title: "Invalid exit price",
          description: "Please enter a valid exit price",
          variant: "destructive"
        })
        return
      }
      
      const quantity = parseFloat(exitData.quantity)
      if (isNaN(quantity) || quantity <= 0 || quantity > trade.quantity) {
        toast({
          title: "Invalid quantity",
          description: "Please enter a valid quantity",
          variant: "destructive"
        })
        return
      }
      
      // Check if quantity is a multiple of board lot size
      if (boardLotSize && !validateQuantity(quantity)) {
        toast({
          title: "Invalid quantity",
          description: `Quantity must be a multiple of the board lot size (${boardLotSize})`,
          variant: "destructive"
        })
        return
      }
      
      // Format the exit date as YYYY-MM-DD
      const formattedExitDate = exitData.exit_date.toISOString().split('T')[0]
      
      // If selling the entire position
      if (quantity === trade.quantity) {
        await tradeService.closeTrade(trade.id, exitPrice, formattedExitDate)
        toast({
          title: `${trade.symbol} - Trade closed`,
          description: `Your ${trade.symbol} trade has been successfully closed`
        })
      } 
      // If selling part of the position
      else {
        await tradeService.partialSell(trade.id, exitPrice, formattedExitDate, quantity)
        toast({
          title: `${trade.symbol} - Position partially sold`,
          description: `${quantity} shares of ${trade.symbol} have been sold`
        })
      }
      
      // Refresh the trade history
      refreshHistory();
      
      onTradeUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error closing trade:', error)
      toast({
        title: `Error with ${trade.symbol}`,
        description: error instanceof Error ? error.message : "Failed to close trade",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to adjust quantity to nearest valid board lot
  const adjustToValidQuantity = (quantity: number): number => {
    if (!boardLotSize || boardLotSize <= 0) return quantity;
    
    // Round down to nearest board lot multiple
    const validQuantity = Math.floor(quantity / boardLotSize) * boardLotSize;
    
    // If result is 0, return at least one board lot
    return validQuantity > 0 ? validQuantity : boardLotSize;
  }

  // Handle quantity change with validation
  const handleQuantityChange = (value: string) => {
    const numValue = parseFloat(value);
    
    // Always update the input field with what the user typed
    setExitData(prev => ({ ...prev, quantity: value }));
    
    // If the user clears the field or enters an invalid number, don't show suggestions
    if (isNaN(numValue) || numValue <= 0) return;
    
    // If the quantity is not a multiple of board lot size, suggest a valid quantity
    if (boardLotSize && numValue % boardLotSize !== 0) {
      const validQuantity = adjustToValidQuantity(numValue);
      setSuggestedQuantity(validQuantity);
    } else {
      setSuggestedQuantity(null);
    }
  }

  // Add a date formatter utility function
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD for input[type="date"]
  }

  if (!trade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trade.symbol} - {trade.side === 'long' ? 'Buy' : 'Sell'} Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <Label>Status</Label>
              <div className="mt-1">
                {trade.status === 'open' ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">Open</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-medium">Closed</span>
                )}
              </div>
            </div>

            {/* P&L */}
            <div>
              <Label>{trade.status === 'closed' ? 'Final P&L' : 'P&L (Current)'}</Label>
              <div className="mt-1">
                {trade.status === 'closed' ? (
                  // For closed trades, show the final P&L
                  trade.pnl != null ? (
                    <span className={trade.pnl >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                      ₱{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-gray-500">Calculating...</span>
                  )
                ) : (
                  // For open trades, use the unrealized_pnl from the trade object instead of partialSellPnL
                  trade.unrealized_pnl != null ? (
                    <>
                      <span className={trade.unrealized_pnl >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                        ₱{trade.unrealized_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Based on current market price
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-500">Calculating...</span>
                  )
                )}
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <Label>Entry Price</Label>
              <div className="mt-1">₱{trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            {/* Exit Price (if closed) */}
            {trade.status === 'closed' && trade.exit_price != null && (
              <div>
                <Label>Exit Price</Label>
                <div className="mt-1">₱{trade.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            )}

            {/* Current Price (if open) */}
            {trade.status === 'open' && (
              <div>
                <Label>Current Price</Label>
                <div className="mt-1">
                  {trade.current_price ? (
                    `₱${trade.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    // Use entry price if current price isn't available
                    `₱${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (using entry price)`
                  )}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label>Quantity</Label>
              <div className="mt-1">{trade.quantity.toLocaleString()}</div>
              {boardLotSize && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Board Lot: {boardLotSize.toLocaleString()}
                </div>
              )}
            </div>

            {/* Entry Date */}
            <div>
              <Label>Entry Date</Label>
              <div className="mt-1">{format(new Date(trade.entry_date), 'MMM d, yyyy')}</div>
            </div>

            {/* Exit Date (if closed) */}
            {trade.status === 'closed' && trade.exit_date && (
              <div>
                <Label>Exit Date</Label>
                <div className="mt-1">{format(new Date(trade.exit_date), 'MMM d, yyyy')}</div>
              </div>
            )}

            {/* Strategy */}
            {trade.strategy && (
              <div>
                <Label>Strategy</Label>
                <div className="mt-1">{trade.strategy}</div>
              </div>
            )}

            {/* Notes */}
            {trade.notes && (
              <div>
                <Label>Notes</Label>
                <div className="mt-1">{trade.notes}</div>
              </div>
            )}
          </div>

          {trade.status === 'open' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Sell</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={trade.quantity}
                    value={exitData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setExitData(prev => ({ ...prev, quantity: trade.quantity.toString() }))}
                  >
                    All
                  </Button>
                </div>
                {boardLotSize && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Quantity must be a multiple of board lot size: {boardLotSize.toLocaleString()}
                  </div>
                )}
                {suggestedQuantity && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <span>Suggested valid quantity: {suggestedQuantity.toLocaleString()}</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2"
                      onClick={() => setExitData(prev => ({ ...prev, quantity: suggestedQuantity.toString() }))}
                    >
                      Use this
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price</Label>
                <div className="flex gap-2">
                  <Input
                    id="exit_price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={exitData.exit_price}
                    onChange={(e) => setExitData({ ...exitData, exit_price: e.target.value })}
                    required
                  />
                  {currentPrice ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => setExitData(prev => ({ ...prev, exit_price: currentPrice.toString() }))}
                    >
                      Use Current
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exit_date">Exit Date</Label>
                <Input
                  id="exit_date"
                  type="date"
                  value={formatDateForInput(exitData.exit_date)}
                  onChange={(e) => {
                    // Create a Date object from the input value
                    const date = e.target.value ? new Date(e.target.value) : new Date();
                    // Adjust for timezone if needed
                    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                    setExitData({ ...exitData, exit_date: localDate });
                  }}
                />
              </div>

              {/* P&L Preview */}
              {exitData.quantity && exitData.exit_price && partialSellPnL != null && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">Estimated P&L</div>
                  <div className={`font-semibold ${partialSellPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₱{((partialSellPnL / trade.quantity) * parseFloat(exitData.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <Button 
                type="button" 
                onClick={handleCloseTrade}
                disabled={isSubmitting || !exitData.quantity || !exitData.exit_price}
                className="w-full"
              >
                {isSubmitting 
                  ? (isPartialSell ? 'Selling...' : 'Closing Trade...') 
                  : (isPartialSell ? 'Sell Shares' : 'Close Trade')}
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <TradeHistory tradeId={trade.id} refreshHistoryKey={refreshHistoryKey} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 