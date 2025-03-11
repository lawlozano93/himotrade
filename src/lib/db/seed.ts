import { createClient } from "@supabase/supabase-js"
import { addDays, format, subDays } from "date-fns"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = "https://fqdpwneipzsvkyciairx.supabase.co"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZHB3bmVpcHpzdmt5Y2lhaXJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTYxODYzNCwiZXhwIjoyMDU3MTk0NjM0fQ.Id2eINglR7_du-g1OoT5tvAtEBTGHBnFDQw8sbu4yNE"

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTables() {
  console.log("Checking tables exist...")
  const { data: portfolios } = await supabase.from('portfolios').select('id').limit(1)
  const { data: snapshots } = await supabase.from('portfolio_snapshots').select('id').limit(1)
  const { data: transactions } = await supabase.from('portfolio_transactions').select('id').limit(1)
  const { data: trades } = await supabase.from('trades').select('id').limit(1)
  const { data: strategies } = await supabase.from('strategies').select('id').limit(1)

  if (!portfolios || !snapshots || !transactions || !trades || !strategies) {
    console.error("Error: Tables not found. Please run migrations first.")
    process.exit(1)
  }

  // Wait for schema cache to update
  console.log("Waiting for schema cache to update...")
  await new Promise(resolve => setTimeout(resolve, 5000))
}

async function cleanupPortfolioData() {
  console.log("Cleaning up existing portfolio data...")
  try {
    await supabase.from('portfolio_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('portfolio_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('strategies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log("Cleanup completed")
  } catch (error) {
    console.error("Error during cleanup:", error)
  }
}

async function seedStrategies(userId: string) {
  console.log("Creating strategies for user:", userId)
  const strategies = [
    {
      name: "Trend Following",
      description: "Following established market trends with momentum indicators",
      user_id: userId
    },
    {
      name: "Mean Reversion",
      description: "Trading price movements back to the average",
      user_id: userId
    },
    {
      name: "Breakout",
      description: "Trading significant price level breakouts",
      user_id: userId
    },
    {
      name: "Swing Trading",
      description: "Capturing gains within an overall trend",
      user_id: userId
    },
    {
      name: "Scalping",
      description: "Making small profits on short-term price changes",
      user_id: userId
    }
  ]

  const { data: createdStrategies, error } = await supabase
    .from('strategies')
    .upsert(strategies)
    .select()

  if (error) {
    console.error("Error seeding strategies:", error)
    return null
  }

  console.log("Created strategies:", createdStrategies?.map(s => s.name).join(", "))
  return createdStrategies
}

async function seedTrades(userId: string, portfolioId: string, strategies: any[]) {
  console.log("Creating trades for portfolio:", portfolioId)
  
  // Generate a mix of open and closed trades
  const trades = [
    // Historical trades (closed) with varying profits/losses
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "AAPL",
      side: "long",
      entry_price: 175.50,
      exit_price: 180.25,
      quantity: 10,
      status: "closed",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 60), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 170.00,
      take_profit: 185.00,
      notes: "Strong earnings report, hit take profit target",
      risk_reward_ratio: 2.5,
      pnl: 47.50,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "GOOGL",
      side: "long",
      entry_price: 140.00,
      exit_price: 135.50,
      quantity: 15,
      status: "closed",
      strategy_id: strategies[1]?.id || null,
      entry_date: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 50), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 135.00,
      take_profit: 150.00,
      notes: "Stopped out due to market volatility",
      risk_reward_ratio: 2.0,
      pnl: -67.50,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "TSLA",
      side: "short",
      entry_price: 250.00,
      exit_price: 235.00,
      quantity: 8,
      status: "closed",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 50), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 45), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 260.00,
      take_profit: 230.00,
      notes: "Technical breakdown, good short setup",
      risk_reward_ratio: 2.0,
      pnl: 120.00,
      asset_type: "stocks",
      market: "US"
    },
    // Additional historical trades
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "AMZN",
      side: "long",
      entry_price: 130.00,
      exit_price: 145.00,
      quantity: 20,
      status: "closed",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 45), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 125.00,
      take_profit: 150.00,
      notes: "Strong breakout above resistance",
      risk_reward_ratio: 3.0,
      pnl: 300.00,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "META",
      side: "short",
      entry_price: 320.00,
      exit_price: 315.00,
      quantity: 10,
      status: "closed",
      strategy_id: strategies[1]?.id || null,
      entry_date: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 325.00,
      take_profit: 310.00,
      notes: "Quick scalp at resistance",
      risk_reward_ratio: 1.5,
      pnl: 50.00,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "NVDA",
      side: "long",
      entry_price: 450.00,
      exit_price: 440.00,
      quantity: 5,
      status: "closed",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 440.00,
      take_profit: 470.00,
      notes: "Stopped out at support level",
      risk_reward_ratio: 2.0,
      pnl: -50.00,
      asset_type: "stocks",
      market: "US"
    },
    // Historical Forex trades
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "EUR/USD",
      side: "long",
      entry_price: 1.0850,
      exit_price: 1.0920,
      quantity: 100000,
      status: "closed",
      strategy_id: strategies[3]?.id || null,
      entry_date: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 28), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 1.0800,
      take_profit: 1.0950,
      notes: "Strong support level bounce",
      risk_reward_ratio: 2.0,
      pnl: 700.00,
      asset_type: "forex",
      market: null
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "GBP/USD",
      side: "short",
      entry_price: 1.2750,
      exit_price: 1.2650,
      quantity: 75000,
      status: "closed",
      strategy_id: strategies[4]?.id || null,
      entry_date: format(subDays(new Date(), 25), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 23), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 1.2800,
      take_profit: 1.2600,
      notes: "Break of trendline support",
      risk_reward_ratio: 2.0,
      pnl: 750.00,
      asset_type: "forex",
      market: null
    },
    // Historical Crypto trades
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "BTC/USD",
      side: "long",
      entry_price: 42000.00,
      exit_price: 43500.00,
      quantity: 0.5,
      status: "closed",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 20), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 17), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 41000.00,
      take_profit: 44000.00,
      notes: "Bitcoin breakout trade",
      risk_reward_ratio: 3.0,
      pnl: 750.00,
      asset_type: "crypto",
      market: null
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "ETH/USD",
      side: "short",
      entry_price: 2300.00,
      exit_price: 2200.00,
      quantity: 3,
      status: "closed",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 15), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 12), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 2350.00,
      take_profit: 2150.00,
      notes: "Ethereum resistance rejection",
      risk_reward_ratio: 2.0,
      pnl: 300.00,
      asset_type: "crypto",
      market: null
    },
    // Current open trades
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "MSFT",
      side: "long",
      entry_price: 320.75,
      quantity: 5,
      status: "open",
      strategy_id: strategies[1]?.id || null,
      entry_date: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 310.00,
      take_profit: 340.00,
      notes: "Bullish trend continuation, waiting for breakout",
      risk_reward_ratio: 1.8,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "NVDA",
      side: "short",
      entry_price: 480.00,
      quantity: 4,
      status: "open",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 495.00,
      take_profit: 450.00,
      notes: "Overbought conditions, potential reversal",
      risk_reward_ratio: 2.0,
      asset_type: "stocks",
      market: "US"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "BTC/USD",
      side: "long",
      entry_price: 43500.00,
      quantity: 0.25,
      status: "open",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 42500.00,
      take_profit: 45500.00,
      notes: "Bitcoin support bounce play",
      risk_reward_ratio: 2.0,
      asset_type: "crypto",
      market: null
    },
    // Philippine Stock Market Trades (Historical)
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "SM",
      side: "long",
      entry_price: 850.00,
      exit_price: 890.00,
      quantity: 100,
      status: "closed",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 45), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 830.00,
      take_profit: 900.00,
      notes: "Breakout from consolidation, strong retail growth",
      risk_reward_ratio: 2.5,
      pnl: 4000.00,
      asset_type: "stocks",
      market: "PH"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "ALI",
      side: "long",
      entry_price: 28.50,
      exit_price: 27.00,
      quantity: 1000,
      status: "closed",
      strategy_id: strategies[1]?.id || null,
      entry_date: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 27.00,
      take_profit: 31.00,
      notes: "Property sector pullback, stopped out",
      risk_reward_ratio: 1.7,
      pnl: -1500.00,
      asset_type: "stocks",
      market: "PH"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "JFC",
      side: "short",
      entry_price: 250.00,
      exit_price: 235.00,
      quantity: 200,
      status: "closed",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 260.00,
      take_profit: 230.00,
      notes: "Bearish trend continuation after earnings miss",
      risk_reward_ratio: 1.5,
      pnl: 3000.00,
      asset_type: "stocks",
      market: "PH"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "BDO",
      side: "long",
      entry_price: 120.00,
      exit_price: 128.00,
      quantity: 500,
      status: "closed",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      exit_date: format(subDays(new Date(), 25), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 115.00,
      take_profit: 130.00,
      notes: "Banking sector momentum play",
      risk_reward_ratio: 2.0,
      pnl: 4000.00,
      asset_type: "stocks",
      market: "PH"
    },
    // Current Open Philippine Stock Trades
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "TEL",
      side: "long",
      entry_price: 1450.00,
      quantity: 50,
      status: "open",
      strategy_id: strategies[0]?.id || null,
      entry_date: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 1400.00,
      take_profit: 1550.00,
      notes: "5G expansion play, strong technical setup",
      risk_reward_ratio: 2.0,
      asset_type: "stocks",
      market: "PH"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "MER",
      side: "long",
      entry_price: 265.00,
      quantity: 200,
      status: "open",
      strategy_id: strategies[1]?.id || null,
      entry_date: format(subDays(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 255.00,
      take_profit: 285.00,
      notes: "Utilities sector rotation, support bounce",
      risk_reward_ratio: 2.0,
      asset_type: "stocks",
      market: "PH"
    },
    {
      user_id: userId,
      portfolio_id: portfolioId,
      symbol: "AC",
      side: "short",
      entry_price: 680.00,
      quantity: 100,
      status: "open",
      strategy_id: strategies[2]?.id || null,
      entry_date: format(subDays(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      stop_loss: 700.00,
      take_profit: 640.00,
      notes: "Bearish divergence at resistance",
      risk_reward_ratio: 2.0,
      asset_type: "stocks",
      market: "PH"
    }
  ]

  const { error: tradeError } = await supabase
    .from('trades')
    .insert(trades)

  if (tradeError) {
    console.error("Error seeding trades:", tradeError)
    console.error("Full error details:", JSON.stringify(tradeError, null, 2))
    return
  }

  console.log("Created trades for portfolio:", portfolioId)
}

async function seedPortfolios(userId: string, strategies: any[]) {
  console.log("Creating portfolios for user:", userId)
  const portfolios = [
    {
      name: "Main Trading Account",
      currency: "PHP",
      initial_balance: 100000,
      current_balance: 100000,
      available_cash: 100000,
      user_id: userId
    },
    {
      name: "US Stock Portfolio",
      currency: "USD",
      initial_balance: 5000,
      current_balance: 5000,
      available_cash: 5000,
      user_id: userId
    }
  ]

  const { data: createdPortfolios, error: portfolioError } = await supabase
    .from('portfolios')
    .insert(portfolios)
    .select()

  if (portfolioError) {
    console.error("Error seeding portfolios:", portfolioError)
    console.error("Full error details:", JSON.stringify(portfolioError, null, 2))
    return
  }

  console.log("Created portfolios:", createdPortfolios?.map(p => p.name).join(", "))

  // Create sample transactions and snapshots for each portfolio
  for (const portfolio of createdPortfolios!) {
    console.log("Creating transactions for portfolio:", portfolio.id)
    const transactions = [
      {
        portfolio_id: portfolio.id,
        type: "deposit",
        amount: portfolio.initial_balance,
        notes: "Initial deposit",
        created_at: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ssXXX")
      },
      {
        portfolio_id: portfolio.id,
        type: "deposit",
        amount: portfolio.currency === "PHP" ? 50000 : 2000,
        notes: "Additional investment",
        created_at: format(subDays(new Date(), 15), "yyyy-MM-dd'T'HH:mm:ssXXX")
      },
      {
        portfolio_id: portfolio.id,
        type: "withdrawal",
        amount: portfolio.currency === "PHP" ? 20000 : 1000,
        notes: "Profit taking",
        created_at: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ssXXX")
      }
    ]

    const { error: transactionError } = await supabase
      .from('portfolio_transactions')
      .insert(transactions)

    if (transactionError) {
      console.error("Error seeding transactions:", transactionError)
      console.error("Full error details:", JSON.stringify(transactionError, null, 2))
      continue
    }

    console.log("Created transactions for portfolio:", portfolio.id)

    // Create daily snapshots for the last 30 days
    console.log("Creating snapshots for portfolio:", portfolio.id)
    const snapshots = []
    let currentValue = portfolio.initial_balance
    let equityValue = 0
    let realizedPnl = 0
    let unrealizedPnl = 0

    for (let i = 30; i >= 0; i--) {
      // Simulate some random market movements
      const dailyChange = (Math.random() - 0.45) * (currentValue * 0.02) // -0.9% to +1.1% daily change
      currentValue += dailyChange
      equityValue = currentValue * 0.7 // Assume 70% is invested in equity
      realizedPnl += dailyChange * 0.3 // Assume 30% of daily change is realized
      unrealizedPnl = dailyChange * 0.7 // Assume 70% of daily change is unrealized

      snapshots.push({
        portfolio_id: portfolio.id,
        total_value: currentValue,
        cash_value: currentValue * 0.3, // Assume 30% is in cash
        equity_value: equityValue,
        realized_pnl: realizedPnl,
        unrealized_pnl: unrealizedPnl,
        snapshot_date: format(subDays(new Date(), i), "yyyy-MM-dd"),
        created_at: format(subDays(new Date(), i), "yyyy-MM-dd'T'HH:mm:ssXXX")
      })
    }

    const { error: snapshotError } = await supabase
      .from('portfolio_snapshots')
      .insert(snapshots)

    if (snapshotError) {
      console.error("Error seeding snapshots:", snapshotError)
      console.error("Full error details:", JSON.stringify(snapshotError, null, 2))
    } else {
      console.log("Created snapshots for portfolio:", portfolio.id)
    }

    // Create trades only for US Stock Portfolio
    if (portfolio.currency === "USD") {
      await seedTrades(userId, portfolio.id, strategies)
    }
  }
}

export async function seedData(userId: string) {
  console.log('[Seed] Starting to seed data for user:', userId)
  const supabase = createClientComponentClient()

  const testTrades = [
    {
      user_id: userId,
      date: new Date().toISOString(),
      symbol: 'AAPL',
      type: 'stocks',
      market: 'US',
      side: 'long',
      entry_price: 175.50,
      current_price: null,
      quantity: 10,
      strategy: 'Momentum',
      status: 'open',
      pnl: null,
      notes: 'Test trade for Apple',
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      date: new Date().toISOString(),
      symbol: 'GOOGL',
      type: 'stocks',
      market: 'US',
      side: 'long',
      entry_price: 140.25,
      current_price: null,
      quantity: 5,
      strategy: 'Value',
      status: 'open',
      pnl: null,
      notes: 'Test trade for Google',
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      date: new Date().toISOString(),
      symbol: 'SM',
      type: 'stocks',
      market: 'PH',
      side: 'long',
      entry_price: 890.00,
      current_price: null,
      quantity: 100,
      strategy: 'Value',
      status: 'open',
      pnl: null,
      notes: 'Test trade for SM',
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      date: new Date().toISOString(),
      symbol: 'ALI',
      type: 'stocks',
      market: 'PH',
      side: 'long',
      entry_price: 28.50,
      current_price: null,
      quantity: 1000,
      strategy: 'Growth',
      status: 'open',
      pnl: null,
      notes: 'Test trade for Ayala Land',
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      symbol: 'MSFT',
      type: 'stocks',
      market: 'US',
      side: 'long',
      entry_price: 310.75,
      current_price: 320.50,
      quantity: 8,
      strategy: 'Growth',
      status: 'closed',
      pnl: 77.75,
      notes: 'Test closed trade for Microsoft',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ]

  console.log('[Seed] Inserting test trades:', testTrades)

  try {
    // First, delete existing test trades for this user
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[Seed] Error deleting existing trades:', deleteError)
      throw deleteError
    }

    console.log('[Seed] Deleted existing trades')

    // Insert new test trades
    const { data, error } = await supabase
      .from('trades')
      .insert(testTrades)
      .select()

    if (error) {
      console.error('[Seed] Error seeding data:', error)
      throw error
    }

    console.log('[Seed] Successfully inserted trades:', data)
    return data
  } catch (error) {
    console.error('[Seed] Unexpected error:', error)
    throw error
  }
} 