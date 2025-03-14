import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'
import https from 'https'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function fetchPSEStocksPage(pageNo: number): Promise<string> {
  const url = 'https://edge.pse.com.ph/companyDirectory/search.ax'

  return new Promise<string>((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      rejectUnauthorized: false,
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve(data)
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(`pageNo=${pageNo}&sortType=&sortField=&searchField=&searchValue=`)
    req.end()
  })
}

async function insertStocksBatch(stocks: { symbol: string; name: string }[]) {
  console.log(`Inserting batch of ${stocks.length} stocks...`)
  const { error } = await supabase
    .from('stocks')
    .upsert(
      stocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        market: 'PH',
      }))
    )

  if (error) {
    console.error('Error inserting stocks:', error)
    return false
  }
  
  console.log(`Successfully inserted batch of ${stocks.length} stocks`)
  return true
}

async function populateStocks() {
  try {
    console.log('Fetching PSE stocks...')
    const allStocks: { symbol: string; name: string }[] = []
    let pageNo = 1
    let hasMorePages = true
    let batchSize = 50
    let currentBatch: { symbol: string; name: string }[] = []

    while (hasMorePages) {
      console.log(`Fetching page ${pageNo}...`)
      const html = await fetchPSEStocksPage(pageNo)
      const dom = new JSDOM(html)
      const document = dom.window.document

      const rows = document.querySelectorAll('table.list tr')
      console.log(`Found ${rows.length} rows on page ${pageNo}`)
      
      if (rows.length <= 1) { // Only header row
        console.log('No more pages to fetch')
        hasMorePages = false
        continue
      }

      rows.forEach((row: Element) => {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          const symbol = cells[1].textContent?.trim() || ''
          const name = cells[2].textContent?.trim() || ''
          if (symbol && name) {
            currentBatch.push({ symbol, name })
            allStocks.push({ symbol, name })
            
            if (currentBatch.length >= batchSize) {
              insertStocksBatch(currentBatch)
              currentBatch = []
            }
          }
        }
      })

      pageNo++
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Insert any remaining stocks
    if (currentBatch.length > 0) {
      await insertStocksBatch(currentBatch)
    }

    console.log(`Total stocks found: ${allStocks.length}`)
    console.log('Stock symbols:', allStocks.map(s => s.symbol).join(', '))
  } catch (error) {
    console.error('Error:', error)
  }
}

populateStocks() 