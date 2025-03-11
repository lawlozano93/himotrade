import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const market = searchParams.get('market')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    if (market === 'PH') {
      // For Philippine stocks, append .PS to the symbol for Yahoo Finance
      const pseSymbol = `${symbol}.PS`
      console.log(`[Stock Price API] Fetching Philippine stock ${symbol} as ${pseSymbol}`)
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${pseSymbol}?interval=1m&range=1d`
      )
      const data = await response.json()

      if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const price = data.chart.result[0].meta.regularMarketPrice
        console.log(`[Stock Price API] Found price for ${symbol}: ₱${price}`)
        return NextResponse.json({ price })
      }

      // Try alternative suffix .PSE if .PS fails
      console.log(`[Stock Price API] Retrying with .PSE suffix`)
      const pseSuffixSymbol = `${symbol}.PSE`
      const retryResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${pseSuffixSymbol}?interval=1m&range=1d`
      )
      const retryData = await retryResponse.json()

      if (retryData?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const price = retryData.chart.result[0].meta.regularMarketPrice
        console.log(`[Stock Price API] Found price for ${symbol} with .PSE: ₱${price}`)
        return NextResponse.json({ price })
      }
    } else {
      // For US stocks, use the symbol as is
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`
      )
      const data = await response.json()

      if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const price = data.chart.result[0].meta.regularMarketPrice
        console.log(`[Stock Price API] Found price for ${symbol}: $${price}`)
        return NextResponse.json({ price })
      }
    }

    console.log(`[Stock Price API] Price not found for ${symbol}`)
    return NextResponse.json({ error: 'Price not found' }, { status: 404 })
  } catch (error) {
    console.error(`[Stock Price API] Error fetching stock price for ${symbol}:`, error)
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic' 