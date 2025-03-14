import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Trade, TradeRemark, TradeImage } from '@/lib/types'
import type { TradeHistory } from '@/lib/types/trade'
import { calculatePnL } from '@/lib/utils/fees'
import { calculateBoardLot } from '@/lib/utils/boardLot'

const supabase = createClientComponentClient()

export const tradeService = {
  async getTradeById(id: string): Promise<Trade | null> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getTrades(userId: string): Promise<Trade[]> {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })

    if (error) throw error
    return trades
  },

  async createTrade(trade: {
    user_id: string
    portfolio_id: string
    symbol: string
    side: 'long' | 'short'
    entry_price: number
    quantity: number
    entry_date: string
    market?: 'PH' | 'US' | null
    asset_type?: 'stocks' | 'forex' | 'crypto'
    notes?: string | null
    strategy?: string | null
    strategy_id?: string | null
  }): Promise<{ id: string; merged: boolean }> {
    const now = new Date().toISOString()
    
    // Verify the current authenticated user
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Authentication error:', userError)
      throw new Error('Authentication error. Please try logging in again.')
    }
    
    if (!currentUser) {
      throw new Error('You must be logged in to create a trade')
    }
    
    // Verify the portfolio belongs to the current user (critical for RLS)
    console.log('Verifying portfolio ownership...')
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('user_id')
      .eq('id', trade.portfolio_id)
      .single()
      
    if (portfolioError) {
      console.error('Portfolio verification error:', portfolioError)
      throw new Error('Could not verify portfolio ownership. Please try again.')
    }
    
    if (!portfolio || portfolio.user_id !== currentUser.id) {
      console.error('Portfolio ownership mismatch:', {
        currentUserId: currentUser.id,
        portfolioUserId: portfolio?.user_id,
        requestedPortfolioId: trade.portfolio_id
      })
      throw new Error('You do not have permission to create trades in this portfolio.')
    }
    
    // Ensure we're using the currently authenticated user's ID
    trade.user_id = currentUser.id
    
    const { strategy_id, ...cleanTrade } = trade;
    
    let strategyName = trade.strategy;
    
    try {
      // Check if there's an existing open trade with the same symbol and side
      const { data: existingTrades, error: findError } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', trade.portfolio_id)
        .eq('symbol', trade.symbol)
        .eq('side', trade.side)
        .eq('status', 'open')
        
      if (findError) throw findError
      
      // If an existing open trade is found, update it instead of creating a new one
      if (existingTrades && existingTrades.length > 0) {
        const existingTrade = existingTrades[0]
        
        // Calculate the new average entry price based on the existing and new positions
        const totalQuantity = existingTrade.quantity + trade.quantity
        const weightedEntryPrice = (
          (existingTrade.entry_price * existingTrade.quantity) + 
          (trade.entry_price * trade.quantity)
        ) / totalQuantity
        
        // Update the existing trade with the new quantity and average entry price
        const { data: updatedTrade, error: updateError } = await supabase
          .from('trades')
          .update({
            quantity: totalQuantity,
            entry_price: weightedEntryPrice,
            notes: trade.notes || existingTrade.notes,
            strategy_id: trade.strategy_id || existingTrade.strategy_id,
            updated_at: now
          })
          .eq('id', existingTrade.id)
          .select()
          .single()
          
        if (updateError) throw updateError
        
        return { id: existingTrade.id, merged: true }
      }
      
      // If no existing trade is found, create a new one
      console.log('About to insert new trade with data:', {
        ...cleanTrade,
        status: 'open',
        market: cleanTrade.market || 'PH',
        asset_type: cleanTrade.asset_type || 'stocks',
        notes: cleanTrade.notes || null,
        strategy_id: trade.strategy_id || null
      });
      
      // Try with direct SQL first as a workaround for RLS issues
      try {
        console.log('Attempting direct SQL insert as workaround...');
        const { data: directData, error: directError } = await supabase.rpc('insert_trade', {
          p_user_id: cleanTrade.user_id,
          p_portfolio_id: cleanTrade.portfolio_id,
          p_symbol: cleanTrade.symbol,
          p_side: cleanTrade.side,
          p_entry_price: cleanTrade.entry_price,
          p_quantity: cleanTrade.quantity,
          p_entry_date: cleanTrade.entry_date,
          p_status: 'open',
          p_market: cleanTrade.market || 'PH',
          p_asset_type: cleanTrade.asset_type || 'stocks',
          p_notes: cleanTrade.notes || null,
          p_strategy_id: trade.strategy_id || null
        });
        
        if (directError) {
          console.error('Direct SQL insert failed:', directError);
          // Fall back to normal insert
        } else {
          console.log('Direct SQL insert succeeded:', directData);
          return { id: directData.id, merged: false };
        }
      } catch (directSqlError) {
        console.error('Error in direct SQL approach:', directSqlError);
        // Continue with normal approach
      }
      
      // Continue with normal REST API approach if direct SQL failed
      const { data, error } = await supabase
        .from('trades')
        .insert({
          ...cleanTrade,
          status: 'open',
          pnl: null,
          exit_price: null,
          exit_date: null,
          current_price: null,
          created_at: now,
          updated_at: now,
          market: cleanTrade.market || 'PH',
          asset_type: cleanTrade.asset_type || 'stocks',
          notes: cleanTrade.notes || null,
          strategy_id: trade.strategy_id || null
        })
        .select()
        .single()

      if (error) {
        console.error('Database error when creating trade:', error);
        // Add more detailed logging
        console.error('RLS likely rejected the operation. Auth user:', currentUser.id);
        console.error('Trade details that failed:', {
          user_id: trade.user_id,
          portfolio_id: trade.portfolio_id,
          symbol: trade.symbol,
          side: trade.side,
          strategy_id: trade.strategy_id,
        });
        throw error;
      }
      
      return { id: data.id, merged: false }
    } catch (error) {
      console.error('Full error details:', error);
      throw error;
    }
  },

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Calculate unrealized P&L if the trade is open
    if (data.status === 'open' && data.current_price) {
      const unrealized_pnl = data.side === 'long'
        ? (data.current_price - data.entry_price) * data.quantity
        : (data.entry_price - data.current_price) * data.quantity
      return { ...data, unrealized_pnl }
    }
    return { ...data, unrealized_pnl: null }
  },

  async deleteTrade(id: string): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async closeTrade(tradeId: string, exitPrice: number, exitDate: string): Promise<Trade> {
    // Try debugging first to see if the trade exists and is accessible
    console.log('Checking trade existence before attempting to close...');
    const debugResult = await this.debugTradeExists(tradeId);
    console.log('Debug trade exists result:', debugResult);
    
    if (!debugResult.exists) {
      console.error('Trade does not exist or is not accessible:', debugResult.message);
      throw new Error(`Trade with ID ${tradeId} does not exist or you don't have permission to access it.`);
    }
    
    // First try using the new safe function (doesn't use session_replication_role)
    try {
      console.log('Attempting to close trade with safe function...');
      const { data: closedTradeSafe, error: safeError } = await supabase.rpc('close_trade_safe', {
        p_trade_id: tradeId,
        p_exit_price: exitPrice,
        p_exit_date: exitDate
      });
      
      if (safeError) {
        console.error('Error closing trade with safe function:', safeError);
        // Fall back to other methods
      } else {
        console.log('Successfully closed trade with safe function');
        if (closedTradeSafe.debug) {
          console.log('Debug info from close_trade_safe:', closedTradeSafe.debug);
        }
        return closedTradeSafe.trade || closedTradeSafe;
      }
    } catch (safeError) {
      console.error('Exception in safe trade closing:', safeError);
      // Continue with other methods
    }

    // Try using the RPC function next
    try {
      console.log('Attempting to close trade via RPC function...');
      const { data: closedTrade, error: rpcError } = await supabase.rpc('close_trade_v2', {
        p_trade_id: tradeId,
        p_exit_price: exitPrice,
        p_exit_date: exitDate
      });
      
      if (rpcError) {
        console.error('Error closing trade via RPC:', rpcError);
        // Fall back to original method
      } else {
        console.log('Successfully closed trade via RPC');
        return closedTrade;
      }
    } catch (rpcError) {
      console.error('Exception in RPC trade closing:', rpcError);
      // Continue with original method as fallback
    }
    
    // Original method as final fallback
    console.log('Falling back to original trade closing method');
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single()

    if (tradeError) {
      console.error('Error fetching trade for closing:', tradeError);
      throw tradeError;
    }

    const pnl = calculatePnL(
      trade.entry_price,
      exitPrice,
      trade.quantity,
      trade.side
    );

    console.log('Calculated P&L for closing trade:', pnl);
    console.log('Updating trade with ID:', tradeId);

    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        exit_price: exitPrice,
        exit_date: exitDate,
        status: 'closed',
        pnl
      })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating trade for closing:', updateError);
      throw updateError;
    }
    
    console.log('Successfully closed trade via direct update');
    
    // Add trade history entry with detailed information
    try {
      await supabase
        .from('trade_history')
        .insert({
          trade_id: tradeId,
          action_type: 'close',
          details: {
            exit_price: exitPrice,
            exit_date: exitDate,
            pnl: pnl,
            entry_price: trade.entry_price,
            quantity: trade.quantity,
            side: trade.side,
            symbol: trade.symbol // Add symbol for better context
          }
        });
    } catch (historyError) {
      console.error('Error adding trade history:', historyError);
      // Don't fail the whole operation if just the history fails
    }

    return updatedTrade;
  },

  async partialSellFallback(
    tradeId: string, 
    exitPrice: number, 
    exitDate: string, 
    sellQuantity: number
  ): Promise<{ originalTrade: Trade, soldTrade: Trade }> {
    try {
      console.log('Using partialSellFallback method');
      
      // Get the original trade
      const { data: originalTrade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single();

      if (tradeError) {
        console.error('Error fetching original trade:', tradeError);
        throw tradeError;
      }
      
      // If selling the entire position, use closeTrade instead
      if (sellQuantity >= originalTrade.quantity) {
        const closedTrade = await this.closeTrade(tradeId, exitPrice, exitDate);
        return { originalTrade: closedTrade, soldTrade: closedTrade };
      }
      
      // Validate the sell quantity
      if (sellQuantity <= 0) {
        throw new Error('Sell quantity must be greater than 0');
      }
      
      const now = new Date().toISOString();
      const remainingQuantity = originalTrade.quantity - sellQuantity;
      
      // Calculate P&L for the sold portion
      const soldPnl = calculatePnL(
        originalTrade.entry_price,
        exitPrice,
        sellQuantity,
        originalTrade.side
      );
      
      // Verify the current authenticated user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        console.error('Authentication error:', userError);
        throw new Error('Authentication error. Please try logging in again.');
      }
      
      // Create a new trade record for the sold portion using direct insert
      console.log('Creating new trade record for sold portion using direct insert');
      
      // First create a basic record with minimal fields
      const { data: soldTrade, error: insertError } = await supabase
        .from('trades')
        .insert({
          user_id: currentUser.id, // Use the currently authenticated user's ID
          portfolio_id: originalTrade.portfolio_id,
          symbol: originalTrade.symbol,
          side: originalTrade.side,
          entry_price: originalTrade.entry_price,
          quantity: sellQuantity,
          entry_date: originalTrade.entry_date,
          exit_price: exitPrice,
          exit_date: exitDate,
          status: 'closed',
          pnl: soldPnl,
          market: originalTrade.market || 'PH',
          asset_type: originalTrade.asset_type || 'stocks',
          strategy_id: originalTrade.strategy_id, // Use strategy_id instead of strategy
          notes: `Partial sell from trade ID: ${originalTrade.id}`,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error in fallback method creating sold trade:', insertError);
        throw insertError;
      }
      
      console.log('Successfully created sold trade record:', soldTrade);
      
      // Update the original trade with the remaining quantity
      const { data: updatedTrade, error: updateError } = await supabase
        .from('trades')
        .update({
          quantity: remainingQuantity,
          updated_at: now
        })
        .eq('id', tradeId)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating original trade:', updateError);
        throw updateError;
      }
      
      // Add trade history entries - using only allowed action types
      try {
        console.log('Adding trade history entry for original trade (partial sell)');
        const { error: historyError1 } = await supabase
          .from('trade_history')
          .insert({
            trade_id: tradeId,
            action_type: 'reduce_position', // Changed from 'update_take_profit' to 'reduce_position'
            details: {
              action: 'partial_sell',
              sold_quantity: sellQuantity,
              remaining_quantity: remainingQuantity,
              exit_price: exitPrice,
              exit_date: exitDate,
              pnl: soldPnl,
              entry_price: originalTrade.entry_price,
              symbol: originalTrade.symbol
            }
          });
          
        if (historyError1) {
          console.error('Error adding history for original trade:', historyError1);
          throw historyError1;
        }
        
        console.log('Adding trade history entry for sold trade (close)');
        const { error: historyError2 } = await supabase
          .from('trade_history')
          .insert({
            trade_id: soldTrade.id,
            action_type: 'close',
            details: {
              exit_price: exitPrice,
              exit_date: exitDate,
              pnl: soldPnl,
              entry_price: originalTrade.entry_price,
              quantity: sellQuantity,
              side: originalTrade.side,
              symbol: originalTrade.symbol
            }
          });
          
        if (historyError2) {
          console.error('Error adding close history for sold trade:', historyError2);
          throw historyError2;
        }
          
        console.log('Successfully added all trade history entries');
      } catch (historyError) {
        console.error('Error adding trade history entries:', historyError);
        // We don't throw here as the main operation succeeded, but we log the error
        // for debugging purposes
      }
      
      return { originalTrade: updatedTrade, soldTrade };
    } catch (error) {
      console.error('Error in partialSellFallback:', error);
      throw error;
    }
  },

  async partialSell(
    tradeId: string, 
    exitPrice: number, 
    exitDate: string, 
    sellQuantity: number
  ): Promise<{ originalTrade: Trade, soldTrade: Trade }> {
    try {
      console.log('Starting partialSell with params:', { tradeId, exitPrice, exitDate, sellQuantity });
      
      // Get the original trade
      const { data: originalTrade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single();

      if (tradeError) {
        console.error('Error fetching original trade:', tradeError);
        throw tradeError;
      }
      
      console.log('Original trade fetched:', originalTrade);
      
      // If selling the entire position, use closeTrade instead
      if (sellQuantity >= originalTrade.quantity) {
        console.log('Selling entire position, redirecting to closeTrade');
        const closedTrade = await this.closeTrade(tradeId, exitPrice, exitDate);
        return { originalTrade: closedTrade, soldTrade: closedTrade };
      }
      
      // Validate the sell quantity
      if (sellQuantity <= 0) {
        throw new Error('Sell quantity must be greater than 0');
      }
      
      // Validate that the sell quantity is a multiple of the board lot size
      const boardLotSize = calculateBoardLot(exitPrice);
      console.log('Board lot size for price', exitPrice, 'is', boardLotSize);
      
      if (sellQuantity % boardLotSize !== 0) {
        throw new Error(`Sell quantity must be a multiple of the board lot size (${boardLotSize})`);
      }
      
      const now = new Date().toISOString();
      const remainingQuantity = originalTrade.quantity - sellQuantity;
      
      console.log('Calculated remaining quantity:', remainingQuantity);
      
      // Validate that the remaining quantity is also a multiple of the board lot size
      if (remainingQuantity % boardLotSize !== 0) {
        throw new Error(`Remaining quantity (${remainingQuantity}) must be a multiple of the board lot size (${boardLotSize})`);
      }
      
      // Calculate P&L for the sold portion
      const soldPnl = calculatePnL(
        originalTrade.entry_price,
        exitPrice,
        sellQuantity,
        originalTrade.side
      );
      
      console.log('Calculated P&L for sold portion:', soldPnl);
      
      // Verify the current authenticated user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        console.error('Authentication error:', userError);
        throw new Error('Authentication error. Please try logging in again.');
      }
      
      // Create a new trade record for the sold portion with minimal fields
      console.log('Creating new trade record for sold portion with minimal fields');
      
      // First create a basic record
      const { data: soldTrade, error: insertError } = await supabase
        .from('trades')
        .insert({
          user_id: currentUser.id, // Use authenticated user's ID
          portfolio_id: originalTrade.portfolio_id,
          symbol: originalTrade.symbol,
          side: originalTrade.side,
          entry_price: originalTrade.entry_price,
          quantity: sellQuantity,
          entry_date: originalTrade.entry_date,
          status: 'closed',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating sold trade record:', insertError);
        throw insertError;
      }
      
      console.log('Successfully created basic sold trade record:', soldTrade);
      
      // Then update it with the remaining fields
      const { data: updatedSoldTrade, error: updateSoldError } = await supabase
        .from('trades')
        .update({
          exit_price: exitPrice,
          exit_date: exitDate,
          pnl: soldPnl,
          market: originalTrade.market,
          asset_type: originalTrade.asset_type,
          strategy_id: originalTrade.strategy_id,
          notes: `Partial sell from trade ID: ${originalTrade.id}`
        })
        .eq('id', soldTrade.id)
        .select()
        .single();
        
      if (updateSoldError) {
        console.error('Error updating sold trade record:', updateSoldError);
        throw updateSoldError;
      }
      
      console.log('Successfully updated sold trade record with additional fields:', updatedSoldTrade);
      
      // Update the original trade with the remaining quantity
      console.log('Updating original trade with remaining quantity:', remainingQuantity);
      
      const { data: updatedTrade, error: updateError } = await supabase
        .from('trades')
        .update({
          quantity: remainingQuantity,
          updated_at: now
        })
        .eq('id', tradeId)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating original trade:', updateError);
        throw updateError;
      }
      
      console.log('Successfully updated original trade:', updatedTrade);
      
      // Add trade history entries - using only allowed action types
      try {
        console.log('Adding trade history entry for original trade (partial sell)');
        const { error: historyError1 } = await supabase
          .from('trade_history')
          .insert({
            trade_id: tradeId,
            action_type: 'reduce_position', // Changed from 'update_take_profit' to 'reduce_position'
            details: {
              action: 'partial_sell',
              sold_quantity: sellQuantity,
              remaining_quantity: remainingQuantity,
              exit_price: exitPrice,
              exit_date: exitDate,
              pnl: soldPnl,
              entry_price: originalTrade.entry_price,
              symbol: originalTrade.symbol
            }
          });
          
        if (historyError1) {
          console.error('Error adding history for original trade:', historyError1);
          throw historyError1;
        }
        
        console.log('Adding trade history entry for sold trade (close)');
        const { error: historyError3 } = await supabase
          .from('trade_history')
          .insert({
            trade_id: updatedSoldTrade.id,
            action_type: 'close',
            details: {
              exit_price: exitPrice,
              exit_date: exitDate,
              pnl: soldPnl,
              entry_price: originalTrade.entry_price,
              symbol: originalTrade.symbol
            }
          });
          
        if (historyError3) {
          console.error('Error adding close history for sold trade:', historyError3);
          throw historyError3;
        }
          
        console.log('Successfully added all trade history entries');
      } catch (historyError) {
        console.error('Error adding trade history entries:', historyError);
        // We don't throw here as the main operation succeeded, but we log the error
        // for debugging purposes
      }
      
      console.log('Partial sell completed successfully');
      return { originalTrade: updatedTrade, soldTrade: updatedSoldTrade };
    } catch (error: any) {
      console.error('Error in primary partialSell method:', error);
      
      // If the error is related to the date column, try the fallback method
      if (error.message && error.message.includes("Could not find the 'date' column")) {
        console.log('Detected date column error, trying fallback method');
        return this.partialSellFallback(tradeId, exitPrice, exitDate, sellQuantity);
      }
      
      throw error;
    }
  },

  async getAnalytics(userId: string) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')

    if (error) throw error

    // Calculate analytics
    const totalTrades = data.length
    const winningTrades = data.filter((trade: Trade) => trade.pnl && trade.pnl > 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const totalPnL = data.reduce((sum: number, trade: Trade) => sum + (trade.pnl || 0), 0)
    
    return {
      winRate,
      totalPnL,
      averageRR: 0, // We're no longer calculating this since stop_loss and take_profit are removed
      totalTrades,
      winningTrades,
    }
  },

  async addRemark(tradeId: string, content: string): Promise<TradeRemark> {
    const { data, error } = await supabase
      .from('trade_remarks')
      .insert({ trade_id: tradeId, content })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async addImage(tradeId: string, url: string, caption?: string): Promise<TradeImage> {
    const { data, error } = await supabase
      .from('trade_images')
      .insert({ trade_id: tradeId, url, caption })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getTradeHistory(tradeId: string): Promise<TradeHistory[]> {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  async addHistoryAction(
    tradeId: string,
    actionType: TradeHistory['action_type'],
    details: Record<string, any>
  ): Promise<TradeHistory> {
    const { data, error } = await supabase
      .from('trade_history')
      .insert({ trade_id: tradeId, action_type: actionType, details })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getTradeWithDetails(tradeId: string): Promise<Trade> {
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select(`
        *,
        remarks:trade_remarks(*),
        images:trade_images(*),
        history:trade_history(*)
      `)
      .eq('id', tradeId)
      .single()

    if (tradeError) throw tradeError

    return trade
  },

  calculateUnrealizedPnL(trade: Trade & { current_price?: number | null }): number {
    if (!trade.current_price) return 0
    
    // Use our SQL function logic directly in JS for consistency
    const entryValue = trade.entry_price * trade.quantity
    const currentValue = trade.current_price * trade.quantity
    
    // Calculate entry fees
    const entryCommission = entryValue * 0.0025
    const entryVat = entryCommission * 0.12
    const entryBrokerFees = entryValue * 0.0001
    const entryPseFees = entryValue * 0.00005
    const entryFees = entryCommission + entryVat + entryBrokerFees + entryPseFees
    
    // Calculate exit fees (if sold at current price)
    const exitCommission = currentValue * 0.0025
    const exitVat = exitCommission * 0.12
    const exitBrokerFees = currentValue * 0.0001
    const exitPseFees = currentValue * 0.00005
    const exitStockTax = currentValue * 0.006 // Stock Transaction Tax
    const exitFees = exitCommission + exitVat + exitBrokerFees + exitPseFees + exitStockTax
    
    // If entry price = current price, just return the total fees as negative
    if (trade.entry_price === trade.current_price) {
      return Number((-1 * (entryFees + exitFees)).toFixed(2))
    }
    
    // Calculate unrealized P&L with all fees considered
    if (trade.side === 'long') {
      return Number(((currentValue - entryValue) - (entryFees + exitFees)).toFixed(2))
    } else {
      return Number(((entryValue - currentValue) - (entryFees + exitFees)).toFixed(2))
    }
  },

  // Function to calculate the total fees (entry + exit) for a trade
  calculateTotalFees(trade: Trade): number {
    const entryValue = trade.entry_price * trade.quantity
    // Use exit price if available, otherwise use current price or entry price
    const exitValue = (trade.exit_price || trade.current_price || trade.entry_price) * trade.quantity
    
    // Calculate entry fees
    const entryCommission = entryValue * 0.0025
    const entryVat = entryCommission * 0.12
    const entryBrokerFees = entryValue * 0.0001
    const entryPseFees = entryValue * 0.00005
    const entryFees = entryCommission + entryVat + entryBrokerFees + entryPseFees
    
    // Calculate exit fees
    const exitCommission = exitValue * 0.0025
    const exitVat = exitCommission * 0.12
    const exitBrokerFees = exitValue * 0.0001
    const exitPseFees = exitValue * 0.00005
    const exitStockTax = exitValue * 0.006 // Only on selling
    const exitFees = exitCommission + exitVat + exitBrokerFees + exitPseFees + exitStockTax
    
    // Return total fees rounded to 2 decimal places
    return Number((entryFees + exitFees).toFixed(2))
  },

  // Debug function to check if a trade exists
  async debugTradeExists(tradeId: string): Promise<any> {
    try {
      console.log('Debugging trade with ID:', tradeId);
      
      // Try direct query first
      const { data: directData, error: directError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId);
      
      if (directError) {
        console.error('Direct query error:', directError);
        return { 
          exists: false, 
          directError,
          message: 'Error querying trade directly'
        };
      }
      
      if (!directData || directData.length === 0) {
        console.log('Trade not found in direct query');
        
        // Try RPC as a fallback
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('debug_get_trade_by_id', {
            p_trade_id: tradeId
          });
          
          if (rpcError) {
            console.error('RPC query error:', rpcError);
            return { 
              exists: false, 
              directError: 'No results from direct query',
              rpcError,
              message: 'Trade not found via RPC either' 
            };
          }
          
          return {
            exists: !!rpcData,
            directFound: false,
            rpcFound: true,
            trade: rpcData,
            message: 'Trade found via RPC but not direct query (RLS issue)'
          };
        } catch (rpcError) {
          console.error('RPC debug error:', rpcError);
          return { 
            exists: false, 
            directError: 'No results from direct query',
            rpcError,
            message: 'Trade not found in any method'
          };
        }
      }
      
      console.log('Trade found:', directData);
      return {
        exists: true,
        count: directData.length,
        trade: directData[0],
        message: 'Trade found via direct query'
      };
    } catch (error) {
      console.error('Unexpected error in debugTradeExists:', error);
      return { exists: false, error, message: 'Unexpected error in debug function' };
    }
  },

  async updateUnrealizedPnL(tradeId: string, currentPrice: number): Promise<Trade> {
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single()

    if (tradeError) throw tradeError

    const unrealizedPnl = calculatePnL(
      trade.entry_price,
      currentPrice,
      trade.quantity,
      trade.side
    );

    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({ current_price: currentPrice })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) throw updateError
    
    // Add the calculated unrealized_pnl to the response object
    return { ...updatedTrade, unrealized_pnl: unrealizedPnl }
  },

  // New function to fetch trades with correct P&L display
  async getTradesWithCorrectPnL(portfolioId: string, status: 'open' | 'closed'): Promise<Trade[]> {
    try {
      console.log(`Loading ${status} trades for portfolio ${portfolioId} with correct P&L display`)
      
      // Use our trade_display_view to get trades with correct P&L values
      const { data, error } = await supabase
        .from('trade_display_view')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', status)
        .order('entry_date', { ascending: false })
      
      if (error) throw error
      
      // Map the display_pnl, data_table_pnl, and trade_info_pnl to our trade objects
      return (data || []).map(trade => ({
        ...trade,
        // For data table display (now showing total fees for consistency with trade info)
        unrealized_pnl: status === 'open' ? trade.data_table_pnl : null,
        // For trade detail display
        total_fees: Math.abs(trade.trade_info_pnl),
        // The correct P&L value to use for calculations
        pnl: trade.display_pnl
      }))
    } catch (error) {
      console.error('Error fetching trades with correct P&L:', error)
      throw error
    }
  },

  // Function to map view data to Trade objects
  async getTradesWithCorrectPnLDisplay(portfolioId: string, status: 'open' | 'closed'): Promise<Trade[]> {
    console.log(`Loading ${status} trades for portfolio ${portfolioId} with correct P&L display`)
    
    // Use our trade_display_view but select only fields compatible with Trade
    const { data, error } = await supabase
      .from('trades') // Use the trades table directly
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('status', status)
      .order('entry_date', { ascending: false })
    
    if (error) throw error
    
    // Process each trade to add the correct P&L values
    const processedTrades = await Promise.all((data || []).map(async (trade) => {
      try {
        // Calculate fees
        const totalFees = this.calculateTotalFees(trade);
        
        // If open trade, calculate unrealized P&L with current price
        if (status === 'open') {
          if (trade.current_price) {
            // Calculate unrealized P&L using the same logic as the backend
            const unrealizedPnL = this.calculateUnrealizedPnL(trade);
            return {
              ...trade,
              unrealized_pnl: unrealizedPnL, // Use the actual calculated unrealized P&L
              total_fee: totalFees
            };
          } else {
            // If no current price, show negative fees as P&L
            return {
              ...trade,
              unrealized_pnl: -totalFees, // Display negative fees if no current price
              total_fee: totalFees
            };
          }
        }
        
        // For closed trades, return with correct P&L
        return {
          ...trade,
          total_fee: totalFees
        };
      } catch (error) {
        console.error('Error processing trade:', error);
        return trade;
      }
    }));
    
    return processedTrades;
  }
} 