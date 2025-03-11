export const STOCK_SYMBOLS = {
  US: [
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT',
    'JNJ', 'PG', 'MA', 'UNH', 'HD', 'BAC', 'XOM', 'PFE', 'CSCO', 'CVX',
    'ADBE', 'CRM', 'NFLX', 'INTC', 'VZ', 'KO', 'PEP', 'ABT', 'MRK', 'DIS',
    'CMCSA', 'COST', 'PYPL', 'TMO', 'ACN', 'NKE', 'DHR', 'NEE', 'T', 'LIN'
  ],
  PH: [] as string[] // Will be populated dynamically
}

export const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
  'NZD/USD', 'USD/SGD', 'USD/HKD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
]

export const CRYPTO_SYMBOLS = [
  'BTC/USD', 'ETH/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD',
  'DOT/USD', 'DOGE/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD', 'UNI/USD'
]

export type StockSymbol = string
export type ForexPair = (typeof FOREX_PAIRS)[number]
export type CryptoSymbol = (typeof CRYPTO_SYMBOLS)[number] 