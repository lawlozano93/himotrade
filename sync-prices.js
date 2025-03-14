#!/usr/bin/env node

/**
 * Stock Price Sync Script
 * 
 * This script syncs stock prices from the phisix API to your Supabase database.
 * Run this from the command line with your Supabase credentials:
 *
 * node sync-prices.js YOUR_SUPABASE_URL YOUR_SUPABASE_SERVICE_KEY
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from command line args
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
  console.error('Usage: node sync-prices.js SUPABASE_URL SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPhilippineStockPrices() {
  return new Promise((resolve, reject) => {
    console.log('Fetching prices from phisix-api3...');
    https.get('https://phisix-api3.appspot.com/stocks.json', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (!parsedData?.stock || !Array.isArray(parsedData.stock)) {
            return reject(new Error('Invalid data format from phisix API'));
          }
          
          const prices = parsedData.stock.map(stock => ({
            symbol: stock.symbol,
            price: parseFloat(stock.price.amount),
            source: 'phisix-api3'
          }));
          
          console.log(`Retrieved ${prices.length} stock prices from API`);
          resolve(prices);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching from primary API:', error);
      
      // Try backup API
      https.get('https://phisix-api4.appspot.com/stocks.json', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            if (!parsedData?.stock || !Array.isArray(parsedData.stock)) {
              return reject(new Error('Invalid data format from backup API'));
            }
            
            const prices = parsedData.stock.map(stock => ({
              symbol: stock.symbol,
              price: parseFloat(stock.price.amount),
              source: 'phisix-api4'
            }));
            
            console.log(`Retrieved ${prices.length} stock prices from backup API`);
            resolve(prices);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (backupError) => {
        console.error('Error fetching from backup API:', backupError);
        reject(error); // Reject with original error
      });
    });
  });
}

async function getOpenTradeSymbols() {
  const { data, error } = await supabase
    .from('trades')
    .select('symbol')
    .eq('status', 'open')
    .order('symbol');
  
  if (error) {
    throw error;
  }
  
  const symbols = [...new Set(data.map(trade => trade.symbol))]; // Remove duplicates
  return symbols;
}

async function syncPrices() {
  try {
    // Get symbols from open trades
    const symbols = await getOpenTradeSymbols();
    
    if (symbols.length === 0) {
      console.log('No open trades found that need price updates.');
      return;
    }
    
    console.log(`Found ${symbols.length} open trade symbols: ${symbols.join(', ')}`);
    
    // Fetch prices from phisix API
    const allStockPrices = await fetchPhilippineStockPrices();
    
    if (!allStockPrices || allStockPrices.length === 0) {
      throw new Error('No stock prices retrieved');
    }
    
    // Filter to just the symbols we need
    const relevantPrices = allStockPrices.filter(price => 
      symbols.includes(price.symbol)
    );
    
    console.log(`Found prices for ${relevantPrices.length} of ${symbols.length} symbols`);
    
    if (relevantPrices.length === 0) {
      console.log('No matching prices found for any of the open trades.');
      return;
    }
    
    // Insert prices into stock_prices table
    const { error: insertError } = await supabase
      .from('stock_prices')
      .insert(
        relevantPrices.map(price => ({
          symbol: price.symbol,
          price: price.price,
          source: price.source,
          timestamp: new Date().toISOString()
        }))
      );
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('Successfully inserted prices into stock_prices table');
    
    // Update current_price in trades table
    let updatedCount = 0;
    for (const priceData of relevantPrices) {
      const { data, error: updateError } = await supabase
        .from('trades')
        .update({ 
          current_price: priceData.price,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', priceData.symbol)
        .eq('status', 'open');
      
      if (updateError) {
        console.error(`Error updating trades for ${priceData.symbol}:`, updateError);
        continue;
      }
      
      updatedCount += 1;
    }
    
    console.log(`Updated current prices for ${updatedCount} symbols`);
    
    // Try to update unrealized PnL
    try {
      // Call the SQL function to update unrealized PnL values
      const { error: rpcError } = await supabase.rpc('update_all_unrealized_pnl');
      
      if (rpcError) {
        console.error('Error updating unrealized PnL:', rpcError);
      } else {
        console.log('Successfully updated unrealized PnL values');
      }
    } catch (pnlError) {
      console.error('Failed to update unrealized PnL:', pnlError);
    }
    
    console.log('Price sync completed successfully');
  } catch (error) {
    console.error('Error syncing prices:', error);
    process.exit(1);
  }
}

// Run the sync
syncPrices().then(() => {
  console.log('Stock price sync job completed');
  process.exit(0);
}); 