import { rateLimiter } from './rateLimiter'

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
const EODHD_API_KEY = process.env.NEXT_PUBLIC_EODHD_API_KEY

export type AssetType = 'stocks' | 'forex' | 'crypto'

export interface PriceData {
  price: number
  currency: 'USD' | 'PHP'
  symbol: string
}

// Cache prices for 1 minute
const priceCache: { [key: string]: { price: number, timestamp: number } } = {}
const CACHE_DURATION = 60000 // 1 minute

// Map PSE symbols to Investing.com IDs
const pseSymbolMap: { [key: string]: string } = {
  'SM': 'sm-prime-holdings',
  'ALI': 'ayala-land',
  'BDO': 'bdo-unibank',
  'AC': 'ayala',
  'JFC': 'jollibee-foods',
  'TEL': 'pldt',
  'BPI': 'bank-of-the-phil-islands',
  'MER': 'meralco',
  'AP': 'aboitiz-power',
  'URC': 'universal-robina'
}

async function fetchPhilippineStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    // Try phisix-api3 first (primary source)
    console.log(`[Price Service] Trying phisix-api3 for ${symbol}...`)
    const response = await fetch('http://phisix-api3.appspot.com/stocks.json')
    const data = await response.json()
    
    if (data?.stock) {
      const stockData = data.stock.find((s: any) => s.symbol === symbol)
      if (stockData?.price?.amount) {
        const price = parseFloat(stockData.price.amount)
        console.log(`[Price Service] Found price from phisix-api3 for ${symbol}: ₱${price}`)
        return { price, currency: 'PHP', symbol }
      }
    }

    // If phisix-api3 fails, try EODHD if API key is available
    if (EODHD_API_KEY) {
      console.log(`[Price Service] Trying EODHD for ${symbol}...`)
      const eodhResponse = await fetch(
        `https://eodhd.com/api/real-time/${symbol}.PSE?fmt=json&api_token=${EODHD_API_KEY}`
      )
      const eodhData = await eodhResponse.json()
      
      if (eodhResponse.ok && eodhData?.close) {
        const price = parseFloat(eodhData.close)
        console.log(`[Price Service] Found price from EODHD for ${symbol}: ₱${price}`)
        return { price, currency: 'PHP', symbol }
      }
    }

    console.error(`[Price Service] No price found for ${symbol} from any source`)
    return null
  } catch (error) {
    console.error(`[Price Service] Error fetching Philippine stock price for ${symbol}:`, error)
    return null
  }
}

async function fetchStockPrice(symbol: string, market: 'US' | 'PH'): Promise<PriceData | null> {
  const cacheKey = `stock:${market}:${symbol}`
  const cached = priceCache[cacheKey]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Price Service] Returning cached price for ${symbol}: ${market === 'PH' ? '₱' : '$'}${cached.price}`)
    return { price: cached.price, currency: market === 'PH' ? 'PHP' : 'USD', symbol }
  }

  try {
    if (market === 'PH') {
      const priceData = await fetchPhilippineStockPrice(symbol)
      if (priceData !== null) {
        priceCache[cacheKey] = { price: priceData.price, timestamp: Date.now() }
        return priceData
      }
      return cached ? { price: cached.price, currency: 'PHP', symbol } : null
    }

    // For US stocks, use Yahoo Finance
    console.log(`[Price Service] Fetching US stock price for ${symbol}...`)
    const response = await fetch(`/api/stocks/price?symbol=${symbol}&market=${market}`)
    const data = await response.json()
    
    if (response.ok && data.price) {
      const price = data.price
      priceCache[cacheKey] = { price, timestamp: Date.now() }
      console.log(`[Price Service] Successfully fetched US stock price for ${symbol}: $${price}`)
      return { price, currency: 'USD', symbol }
    }

    // Fallback to Alpha Vantage for US stocks
    if (!ALPHA_VANTAGE_API_KEY) {
      console.error('[Price Service] Alpha Vantage API key not found')
      return null
    }

    if (!rateLimiter.canMakeRequest('alphavantage')) {
      console.warn(`[Price Service] Rate limit reached for Alpha Vantage. Try again in ${rateLimiter.getTimeUntilNextSlot('alphavantage')}ms`)
      return cached ? { price: cached.price, currency: 'USD', symbol } : null
    }

    console.log(`[Price Service] Falling back to Alpha Vantage for ${symbol}...`)
    rateLimiter.addRequest('alphavantage')
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    
    const avResponse = await fetch(url)
    const avData = await avResponse.json()
    
    if (avData['Global Quote'] && avData['Global Quote']['05. price']) {
      const price = parseFloat(avData['Global Quote']['05. price'])
      priceCache[cacheKey] = { price, timestamp: Date.now() }
      console.log(`[Price Service] Successfully fetched US stock price from Alpha Vantage: $${price}`)
      return { price, currency: 'USD', symbol }
    }
    
    console.error(`[Price Service] Failed to fetch price for ${symbol} from all sources`)
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  } catch (error) {
    console.error(`[Price Service] Error fetching stock price for ${symbol}:`, error)
    return cached ? { price: cached.price, currency: market === 'PH' ? 'PHP' : 'USD', symbol } : null
  }
}

async function fetchCryptoPrice(symbol: string): Promise<PriceData | null> {
  const cacheKey = `crypto:${symbol}`
  const cached = priceCache[cacheKey]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { price: cached.price, currency: 'USD', symbol }
  }

  try {
    // Extract the base currency from the pair (e.g., 'BTC/USD' -> 'bitcoin')
    const cryptoSymbol = symbol.split('/')[0].toLowerCase()
    
    // Map common symbols to CoinGecko IDs
    const symbolToId: { [key: string]: string } = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'usdt': 'tether',
      'bnb': 'binancecoin',
      'xrp': 'ripple',
      'ada': 'cardano',
      'doge': 'dogecoin',
      'sol': 'solana'
    }

    const cryptoId = symbolToId[cryptoSymbol] || cryptoSymbol

    console.log(`[Price Service] Fetching crypto price for ${symbol} (${cryptoId})...`)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`
    )
    const data = await response.json()
    
    if (data[cryptoId]?.usd) {
      const price = data[cryptoId].usd
      priceCache[cacheKey] = { price, timestamp: Date.now() }
      console.log(`[Price Service] Successfully fetched crypto price for ${symbol}: $${price}`)
      return { price, currency: 'USD', symbol }
    }

    // Fallback to Yahoo Finance for major cryptocurrencies
    try {
      const yahooSymbol = `${cryptoSymbol.toUpperCase()}-USD`
      console.log(`[Price Service] Falling back to Yahoo Finance for ${yahooSymbol}...`)
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`
      )
      const yahooData = await yahooResponse.json()
      
      if (yahooData?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const price = yahooData.chart.result[0].meta.regularMarketPrice
        priceCache[cacheKey] = { price, timestamp: Date.now() }
        console.log(`[Price Service] Successfully fetched crypto price from Yahoo: $${price}`)
        return { price, currency: 'USD', symbol }
      }
    } catch (yahooError) {
      console.error(`[Price Service] Yahoo Finance fallback failed for ${symbol}:`, yahooError)
    }

    console.error(`[Price Service] Failed to fetch crypto price for ${symbol}`)
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  } catch (error) {
    console.error(`[Price Service] Error fetching crypto price for ${symbol}:`, error)
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  }
}

async function fetchForexPrice(symbol: string): Promise<PriceData | null> {
  const cacheKey = `forex:${symbol}`
  const cached = priceCache[cacheKey]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { price: cached.price, currency: 'USD', symbol }
  }

  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn('Alpha Vantage API key not found')
    return null
  }

  if (!rateLimiter.canMakeRequest('alphavantage')) {
    console.warn(`Rate limit reached for Alpha Vantage. Try again in ${rateLimiter.getTimeUntilNextSlot('alphavantage')}ms`)
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  }

  try {
    rateLimiter.addRequest('alphavantage')
    const [fromCurrency, toCurrency] = symbol.split('/')
    const response = await fetch(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`
    )
    const data = await response.json()
    
    if (data['Realtime Currency Exchange Rate'] && data['Realtime Currency Exchange Rate']['5. Exchange Rate']) {
      const price = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate'])
      priceCache[cacheKey] = { price, timestamp: Date.now() }
      return { price, currency: 'USD', symbol }
    }
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  } catch (error) {
    console.error('Error fetching forex price:', error)
    return cached ? { price: cached.price, currency: 'USD', symbol } : null
  }
}

export async function getCurrentPrice(symbol: string, assetType: AssetType, market?: 'US' | 'PH'): Promise<PriceData | null> {
  console.log(`[Price Service] Getting current price for ${symbol} (${assetType})${market ? ` in ${market} market` : ''}`)
  
  let priceData: PriceData | null = null
  switch (assetType) {
    case 'stocks':
      priceData = market ? await fetchStockPrice(symbol, market) : null
      break
    case 'crypto':
      priceData = await fetchCryptoPrice(symbol)
      break
    case 'forex':
      priceData = await fetchForexPrice(symbol)
      break
  }

  if (priceData) {
    console.log(`[Price Service] Final price for ${symbol}: ${priceData.currency === 'PHP' ? '₱' : '$'}${priceData.price}`)
  } else {
    console.log(`[Price Service] No price found for ${symbol}`)
  }
  return priceData
} 