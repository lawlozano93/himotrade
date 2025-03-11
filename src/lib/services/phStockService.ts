interface Stock {
  name: string
  symbol: string
  price: {
    currency: string
    amount: number
  }
  percentChange: number
  volume: number
}

interface PhisixResponse {
  stock: Stock[]
  as_of: string
}

let cachedStocks: string[] = []
let lastFetchTime: number = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Default PH stock symbols as fallback
export const DEFAULT_PH_STOCKS = [
  'AC', 'ALI', 'AP', 'BDO', 'BPI', 'GLO', 'ICT', 'JFC', 'MBT', 'MER',
  'PGOLD', 'RLC', 'SECB', 'SM', 'SMC', 'SMPH', 'TEL', 'URC', 'VLL', 'WLCON',
  'AEV', 'AGI', 'BLOOM', 'CEB', 'DMC', 'EMP', 'FGEN', 'FPH', 'GTCap', 'IMI',
  'LTG', 'MAC', 'MAXS', 'MEG', 'MPI', 'NIKL', 'PCOR', 'PXP', 'RWM', 'SCC'
];

export async function getPhStocks(): Promise<string[]> {
  const now = Date.now()
  
  // Return cached data if it's still valid
  if (cachedStocks.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    console.log(`[PhStockService] Using cached stock list (${cachedStocks.length} items)`)
    return cachedStocks
  }

  try {
    console.log('[PhStockService] Fetching updated stock list from phisix...')
    
    // Setting a timeout of 5 seconds for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://phisix-api3.appspot.com/stocks.json', {
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text(); // Get raw text first for debugging
    console.log(`[PhStockService] Raw response length: ${responseText.length} characters`);
    
    let data: PhisixResponse;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('[PhStockService] Error parsing JSON:', error);
      console.error('[PhStockService] Response text snippet:', responseText.substring(0, 200) + '...');
      throw new Error('Failed to parse JSON response');
    }
    
    if (!data.stock || !Array.isArray(data.stock)) {
      console.error('[PhStockService] Unexpected response structure:', data);
      throw new Error('Unexpected response structure');
    }
    
    // Extract and sort symbols
    cachedStocks = data.stock
      .map(stock => stock.symbol)
      .sort((a, b) => a.localeCompare(b))

    lastFetchTime = now
    console.log(`[PhStockService] Successfully fetched ${cachedStocks.length} stocks from phisix-api3`)
    
    return cachedStocks
  } catch (error) {
    console.error('[PhStockService] Error fetching PH stocks:', error)
    
    // Return cached data if available, even if expired
    if (cachedStocks.length > 0) {
      console.log('[PhStockService] Returning cached stock list due to fetch error')
      return cachedStocks
    }
    
    // Return default stock list if no cached data is available
    console.log('[PhStockService] Returning default stock list due to fetch error and no cache')
    return DEFAULT_PH_STOCKS
  }
} 