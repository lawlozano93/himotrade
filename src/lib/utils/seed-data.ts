import { supabase } from '@/lib/services/supabase'

type AssetType = 'stocks' | 'forex' | 'crypto'
type Market = 'US' | 'PH'

const STOCK_SYMBOLS = {
  US: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT'],
  PH: ['SM', 'ALI', 'BDO', 'AC', 'JFC', 'TEL', 'BPI', 'MER', 'AP', 'URC']
}

const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD']
const CRYPTO_SYMBOLS = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD']

function getRandomSymbol(assetType: AssetType, market?: Market) {
  if (assetType === 'stocks' && market) {
    const symbols = STOCK_SYMBOLS[market]
    return symbols[Math.floor(Math.random() * symbols.length)]
  } else if (assetType === 'forex') {
    return FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)]
  } else {
    return CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)]
  }
}

function getRandomPrice() {
  return Math.round(Math.random() * 1000 * 100) / 100
}

function getRandomQuantity() {
  return Math.round(Math.random() * 100)
}

export async function seedData(userId: string) {
  try {
    // First, delete existing trades for this user
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // Get user's portfolios
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, currency')
      .eq('user_id', userId)

    if (portfolioError) throw portfolioError
    if (!portfolios?.length) {
      console.error("No portfolios found for user")
      return { success: false, error: "No portfolios found" }
    }

    // Create some strategies first
    const strategies = [
      'Trend Following',
      'Mean Reversion',
      'Breakout',
      'Swing Trading',
      'Scalping'
    ]

    const { data: strategyData, error: strategyError } = await supabase
      .from('strategies')
      .upsert(
        strategies.map(name => ({
          user_id: userId,
          name
        }))
      )
      .select()

    if (strategyError) throw strategyError

    // Generate random trades
    const trades = []
    const numberOfTrades = 20
    const assetTypes: AssetType[] = ['stocks', 'forex', 'crypto']
    const markets: Market[] = ['US', 'PH']

    for (let i = 0; i < numberOfTrades; i++) {
      const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)]
      const market = assetType === 'stocks' ? markets[Math.floor(Math.random() * markets.length)] : null
      const symbol = getRandomSymbol(assetType, market || undefined)
      const entry_price = getRandomPrice()
      const isOpen = Math.random() > 0.5
      const exit_price = isOpen ? null : entry_price * (1 + (Math.random() * 0.2 - 0.1)) // ±10% from entry
      const side = Math.random() > 0.5 ? 'long' : 'short'
      const quantity = getRandomQuantity()
      const stop_loss = entry_price * (side === 'long' ? 0.95 : 1.05)
      const take_profit = entry_price * (side === 'long' ? 1.1 : 0.9)
      const entry_date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)

      // Select appropriate portfolio based on asset type
      const portfolio = portfolios.find(p => 
        (assetType === 'stocks' && market === 'US' && p.currency === 'USD') ||
        (assetType === 'stocks' && market === 'PH' && p.currency === 'PHP') ||
        (assetType !== 'stocks')
      )

      if (!portfolio) continue

      trades.push({
        user_id: userId,
        portfolio_id: portfolio.id,
        symbol,
        side,
        entry_price,
        exit_price,
        quantity,
        status: isOpen ? 'open' : 'closed',
        strategy_id: strategyData?.[Math.floor(Math.random() * strategyData.length)]?.id,
        entry_date: entry_date.toISOString(),
        exit_date: isOpen ? null : new Date(entry_date.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
        stop_loss,
        take_profit,
        notes: `Sample ${assetType.toUpperCase()} trade${market ? ` in ${market} market` : ''}`,
        asset_type: assetType,
        market
      })
    }

    const { error: insertError } = await supabase
      .from('trades')
      .insert(trades)

    if (insertError) throw insertError

    return { success: true }
  } catch (error) {
    console.error('Error seeding data:', error)
    return { success: false, error }
  }
} 