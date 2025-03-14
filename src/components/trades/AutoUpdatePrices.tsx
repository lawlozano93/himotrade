'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'

interface AutoUpdatePricesProps {
  portfolioId: string
  onPricesUpdated?: () => void
}

// Define proper types for stock prices
interface StockPrice {
  symbol: string
  price: number
  source: string
}

export function AutoUpdatePrices({ portfolioId, onPricesUpdated }: AutoUpdatePricesProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Function to fetch prices from phisix API
  const fetchPhilippineStockPrices = async (): Promise<StockPrice[]> => {
    try {
      console.log('Fetching prices from phisix-api3...')
      const response = await fetch('https://phisix-api3.appspot.com/stocks.json')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from phisix API: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data?.stock || !Array.isArray(data.stock)) {
        throw new Error('Invalid data format from phisix API')
      }
      
      return data.stock.map((stock: any) => ({
        symbol: stock.symbol,
        price: parseFloat(stock.price.amount),
        source: 'phisix-api3'
      }))
    } catch (error) {
      console.error('Error fetching from phisix API:', error)
      
      // Try backup phisix API
      try {
        console.log('Trying backup phisix-api4...')
        const backupResponse = await fetch('https://phisix-api4.appspot.com/stocks.json')
        
        if (!backupResponse.ok) {
          throw new Error(`Failed to fetch from backup API: ${backupResponse.status}`)
        }
        
        const backupData = await backupResponse.json()
        
        if (!backupData?.stock || !Array.isArray(backupData.stock)) {
          throw new Error('Invalid data format from backup API')
        }
        
        return backupData.stock.map((stock: any) => ({
          symbol: stock.symbol,
          price: parseFloat(stock.price.amount),
          source: 'phisix-api4'
        }))
      } catch (backupError) {
        console.error('Error fetching from backup API:', backupError)
        throw error // Throw the original error
      }
    }
  }

  // Function to get all open trade symbols for the current portfolio
  const getOpenTradeSymbols = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('trades')
      .select('symbol')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'open')
      .order('symbol')
    
    if (error) {
      throw error
    }
    
    return data.map(trade => trade.symbol)
  }

  // Function to update prices in the database
  const updatePrices = async () => {
    if (isUpdating) return // Prevent concurrent updates
    
    try {
      setIsUpdating(true)
      
      // Get symbols from open trades
      const symbols = await getOpenTradeSymbols()
      
      if (symbols.length === 0) {
        console.log('No open trades found that require price updates')
        return
      }
      
      console.log(`Found ${symbols.length} open trade symbols: ${symbols.join(', ')}`)
      
      // Fetch prices from phisix API
      const allStockPrices = await fetchPhilippineStockPrices()
      
      if (!allStockPrices || allStockPrices.length === 0) {
        throw new Error('No stock prices retrieved')
      }
      
      console.log(`Retrieved ${allStockPrices.length} stock prices from API`)
      
      // Filter to just the symbols we need
      const relevantPrices = allStockPrices.filter(price => 
        symbols.includes(price.symbol)
      )
      
      console.log(`Found prices for ${relevantPrices.length} of ${symbols.length} symbols`)
      
      if (relevantPrices.length === 0) {
        console.log('No matching prices found for any open trades')
        return
      }
      
      // Insert prices into stock_prices table
      const { error: insertError } = await supabase
        .from('stock_prices')
        .insert(
          relevantPrices.map(price => ({
            symbol: price.symbol,
            price: price.price,
            source: price.source
          }))
        )
      
      if (insertError) {
        throw insertError
      }
      
      console.log('Successfully inserted prices into stock_prices table')
      
      // Update current_price in trades table
      let updatedCount = 0
      for (const priceData of relevantPrices) {
        const { error: updateError } = await supabase
          .from('trades')
          .update({ 
            current_price: priceData.price,
            updated_at: new Date().toISOString()
          })
          .eq('symbol', priceData.symbol)
          .eq('status', 'open')
          .eq('portfolio_id', portfolioId)
        
        if (updateError) {
          console.error(`Error updating trades for ${priceData.symbol}:`, updateError)
          continue
        }
        
        updatedCount += 1
      }
      
      console.log(`Updated current prices for ${updatedCount} symbols`)
      
      // Try to update unrealized PnL
      try {
        // Call the SQL function to update unrealized PnL values
        const { error: rpcError } = await supabase.rpc('update_all_unrealized_pnl')
        
        if (rpcError) {
          console.error('Error updating unrealized PnL:', rpcError)
        } else {
          console.log('Successfully updated unrealized PnL values')
        }
      } catch (pnlError) {
        console.error('Failed to update unrealized PnL:', pnlError)
      }
      
      setLastUpdated(new Date())
      
      // Call the callback to refresh the trade list
      if (onPricesUpdated) {
        onPricesUpdated()
      }
    } catch (error) {
      console.error('Error updating prices:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Run the update when the component mounts
  useEffect(() => {
    if (portfolioId) {
      updatePrices()
    }
    
    // Optional: Set up an interval to refresh prices periodically (e.g., every 5 minutes)
    const intervalId = setInterval(() => {
      if (portfolioId) {
        updatePrices()
      }
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => {
      clearInterval(intervalId) // Clean up on unmount
    }
  }, [portfolioId])

  // No UI needed as it's now automatic
  return null
} 