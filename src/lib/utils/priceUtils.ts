// TODO: Implement real-time price fetching from a market data provider
export const getCurrentPrice = async (symbol: string): Promise<number> => {
  // For now, return a mock price
  // In production, this should fetch real-time price from an API
  return 100
} 