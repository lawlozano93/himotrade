import { createClient } from '@supabase/supabase-js'
import { pseStocks } from '../data/pse-stocks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function populateStocks() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Insert stocks data
    const stocksData = pseStocks.map(stock => ({
      ...stock,
      market: 'PH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('stocks')
      .upsert(stocksData, {
        onConflict: 'symbol'
      })

    if (error) throw error

    // Verify the data was inserted
    const { data: insertedData, error: selectError } = await supabase
      .from('stocks')
      .select('symbol, name, market')
      .order('symbol')

    if (selectError) throw selectError

    console.log('Successfully populated stocks table')
    console.log(`Inserted ${insertedData.length} stocks`)
  } catch (error) {
    console.error('Error populating stocks:', error)
  }
}

populateStocks() 