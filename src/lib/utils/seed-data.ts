import { supabase } from '../services/supabase'
import type { Trade, Strategy } from '../types'

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA']
const STRATEGY_NAMES = ['Trend Following', 'Breakout', 'Mean Reversion', 'Momentum']

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}

function randomPrice(min: number, max: number) {
  return Number((Math.random() * (max - min) + min).toFixed(2))
}

async function clearExistingData(userId: string) {
  // Delete existing trades first (due to foreign key constraints)
  const { error: tradesError } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', userId)

  if (tradesError) {
    console.error('Error deleting existing trades:', tradesError)
    throw tradesError
  }

  // Then delete existing strategies
  const { error: strategiesError } = await supabase
    .from('strategies')
    .delete()
    .eq('user_id', userId)

  if (strategiesError) {
    console.error('Error deleting existing strategies:', strategiesError)
    throw strategiesError
  }
}

async function createStrategies(userId: string): Promise<Strategy[]> {
  console.log('Creating strategies for user:', userId)
  
  const strategies: Strategy[] = STRATEGY_NAMES.map(name => ({
    user_id: userId,
    name,
    description: `${name} trading strategy`,
  }))

  const { data, error } = await supabase
    .from('strategies')
    .insert(strategies)
    .select()

  if (error) {
    console.error('Error creating strategies:', error)
    throw error
  }

  console.log('Created strategies:', data)
  return data
}

async function createTrades(userId: string, strategies: Strategy[], numTrades: number = 50) {
  console.log('Creating trades for user:', userId)
  console.log('Using strategies:', strategies)
  
  const startDate = new Date('2024-01-01')
  const endDate = new Date()
  const trades: Trade[] = []

  for (let i = 0; i < numTrades; i++) {
    const entryDate = randomDate(startDate, endDate)
    const exitDate = Math.random() > 0.2 ? randomDate(new Date(entryDate), endDate) : null
    const entryPrice = randomPrice(100, 1000)
    const exitPrice = exitDate ? randomPrice(entryPrice * 0.8, entryPrice * 1.2) : null
    const status = exitDate ? 'closed' : 'open'

    trades.push({
      user_id: userId,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      side: Math.random() > 0.5 ? 'long' : 'short',
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity: Math.floor(Math.random() * 100) + 1,
      status,
      strategy_id: strategies[Math.floor(Math.random() * strategies.length)].id!,
      entry_date: entryDate,
      exit_date: exitDate,
      stop_loss: entryPrice * 0.95,
      take_profit: entryPrice * 1.15,
      notes: Math.random() > 0.7 ? 'Example trade notes' : null,
    })
  }

  const { error } = await supabase
    .from('trades')
    .insert(trades)

  if (error) {
    console.error('Error creating trades:', error)
    throw error
  }

  console.log('Created trades:', trades.length)
}

export async function seedData(userId: string) {
  try {
    console.log('Starting seed process for user:', userId)
    
    // Clear existing data first
    await clearExistingData(userId)
    
    // Create new strategies
    const strategies = await createStrategies(userId)
    
    // Create new trades
    await createTrades(userId, strategies)

    console.log('Seed process completed successfully')
    return { success: true }
  } catch (error) {
    console.error('Error in seed process:', error)
    return { success: false, error }
  }
} 