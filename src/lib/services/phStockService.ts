interface Stock {
  symbol: string
  name: string
  price: {
    currency: string
    amount: number
  }
  percent_change: number
  volume: number
}

interface PhisixResponse {
  stock: Stock[]
  as_of: string
}

export interface StockOption {
  value: string  // symbol
  label: string  // symbol only
}

// Default PH stock symbols in case API fails
export const DEFAULT_PH_STOCKS: StockOption[] = [
  { value: 'AC', label: 'AC' },
  { value: 'ALI', label: 'ALI' },
  { value: 'AP', label: 'AP' },
  { value: 'BDO', label: 'BDO' },
  { value: 'BPI', label: 'BPI' },
  { value: 'GLO', label: 'GLO' },
  { value: 'ICT', label: 'ICT' },
  { value: 'JFC', label: 'JFC' },
  { value: 'MBT', label: 'MBT' },
  { value: 'MEG', label: 'MEG' },
  { value: 'MER', label: 'MER' },
  { value: 'PGOLD', label: 'PGOLD' },
  { value: 'RLC', label: 'RLC' },
  { value: 'SM', label: 'SM' },
  { value: 'SMC', label: 'SMC' },
  { value: 'TEL', label: 'TEL' },
  { value: 'URC', label: 'URC' },
  { value: 'VLL', label: 'VLL' }
]

const CACHE_KEY = 'ph_stocks'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface CacheData {
  timestamp: number
  stocks: StockOption[]
}

function getCachedStocks(): StockOption[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)
    const now = Date.now()

    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return data.stocks
  } catch (error) {
    console.error('Error reading cached stocks:', error)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function cacheStocks(stocks: StockOption[]) {
  try {
    const data: CacheData = {
      timestamp: Date.now(),
      stocks
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error caching stocks:', error)
  }
}

export async function getPhStocks(): Promise<StockOption[]> {
  try {
    // Check cache first
    const cached = getCachedStocks()
    if (cached) {
      return cached
    }

    // Try primary API first
    try {
      const response = await fetch('https://phisix-api3.appspot.com/stocks.json')
      if (!response.ok) {
        throw new Error('Failed to fetch stocks from primary API')
      }

      const data: PhisixResponse = await response.json()
      if (!data.stock || !Array.isArray(data.stock) || data.stock.length === 0) {
        throw new Error('Invalid or empty data from primary API')
      }

      const stocks = data.stock
        .map(stock => ({
          value: stock.symbol,
          label: stock.symbol
        }))
        .sort((a, b) => a.value.localeCompare(b.value))

      // Cache the results
      cacheStocks(stocks)
      return stocks
    } catch (primaryError) {
      console.error('Error with primary API:', primaryError)
      
      // Try backup API
      const response = await fetch('https://phisix-api4.appspot.com/stocks.json')
      if (!response.ok) {
        throw new Error('Failed to fetch stocks from backup API')
      }

      const data: PhisixResponse = await response.json()
      if (!data.stock || !Array.isArray(data.stock) || data.stock.length === 0) {
        throw new Error('Invalid or empty data from backup API')
      }

      const stocks = data.stock
        .map(stock => ({
          value: stock.symbol,
          label: stock.symbol
        }))
        .sort((a, b) => a.value.localeCompare(b.value))

      // Cache the results
      cacheStocks(stocks)
      return stocks
    }
  } catch (error) {
    console.error('Error fetching PH stocks:', error)
    // Return default list if all APIs fail
    return DEFAULT_PH_STOCKS
  }
} 