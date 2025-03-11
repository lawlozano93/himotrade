import { NextResponse } from 'next/server'

// Map PSE symbols to their company names for better searching
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

const EODHD_API_KEY = process.env.NEXT_PUBLIC_EODHD_API_KEY

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    // Try phisix-api3 first (primary source)
    console.log(`[PH Stock API] Trying phisix-api3 for ${symbol}...`)
    const response = await fetch('http://phisix-api3.appspot.com/stocks.json')
    const data = await response.json()
    
    if (data?.stock) {
      const stockData = data.stock.find((s: any) => s.symbol === symbol)
      if (stockData?.price?.amount) {
        const price = parseFloat(stockData.price.amount)
        console.log(`[PH Stock API] Found price from phisix-api3 for ${symbol}: ₱${price}`)
        return NextResponse.json({ price, source: 'phisix-api3' })
      }
    }

    // If phisix-api3 fails and EODHD API key is available, try EODHD
    if (EODHD_API_KEY) {
      console.log(`[PH Stock API] Trying EODHD for ${symbol}...`)
      const eodhResponse = await fetch(
        `https://eodhd.com/api/real-time/${symbol}.PSE?fmt=json&api_token=${EODHD_API_KEY}`
      )
      const eodhData = await eodhResponse.json()
      
      if (eodhResponse.ok && eodhData?.close) {
        const price = parseFloat(eodhData.close)
        console.log(`[PH Stock API] Found price from EODHD for ${symbol}: ₱${price}`)
        return NextResponse.json({ price, source: 'eodhd' })
      }
    }

    // Try Investing.com
    const mappedSymbol = pseSymbolMap[symbol]
    if (mappedSymbol) {
      console.log(`[PH Stock API] Trying Investing.com for ${symbol}...`)
      try {
        const investingResponse = await fetch(
          `https://api.investing.com/api/search/v2/search?q=${mappedSymbol}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            }
          }
        )
        const investingData = await investingResponse.json()
        if (investingData?.quotes?.[0]?.last) {
          const price = parseFloat(investingData.quotes[0].last)
          console.log(`[PH Stock API] Found price from Investing.com for ${symbol}: ₱${price}`)
          return NextResponse.json({ price, source: 'Investing.com' })
        }
      } catch (investingError) {
        console.error(`[PH Stock API] Investing.com error for ${symbol}:`, investingError)
      }
    }

    // Try MarketWatch as last resort
    console.log(`[PH Stock API] Trying MarketWatch for ${symbol}...`)
    try {
      const mwResponse = await fetch(
        `https://www.marketwatch.com/investing/stock/${symbol}?countryCode=PH`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }
      )
      const mwText = await mwResponse.text()
      const priceMatch = mwText.match(/"price":"(\d+\.\d+)"/)
      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1])
        console.log(`[PH Stock API] Found price from MarketWatch for ${symbol}: ₱${price}`)
        return NextResponse.json({ price, source: 'MarketWatch' })
      }
    } catch (mwError) {
      console.error(`[PH Stock API] MarketWatch error for ${symbol}:`, mwError)
    }

    console.log(`[PH Stock API] No price found for ${symbol} from any source`)
    return NextResponse.json({ error: 'Price not found' }, { status: 404 })
  } catch (error) {
    console.error(`[PH Stock API] Error fetching price for ${symbol}:`, error)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
} 