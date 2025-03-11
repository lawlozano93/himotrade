class RateLimiter {
  private requests: { [key: string]: number[] } = {}
  private limits: { [key: string]: number } = {
    'alphavantage': 5,  // 5 requests per minute
    'coingecko': 30     // 30 requests per minute
  }

  canMakeRequest(api: 'alphavantage' | 'coingecko'): boolean {
    const now = Date.now()
    const windowMs = 60000 // 1 minute window
    
    // Initialize or clean old requests
    if (!this.requests[api]) {
      this.requests[api] = []
    }
    this.requests[api] = this.requests[api].filter(time => now - time < windowMs)
    
    // Check if we can make a new request
    return this.requests[api].length < this.limits[api]
  }

  addRequest(api: 'alphavantage' | 'coingecko'): void {
    if (!this.requests[api]) {
      this.requests[api] = []
    }
    this.requests[api].push(Date.now())
  }

  getTimeUntilNextSlot(api: 'alphavantage' | 'coingecko'): number {
    if (this.canMakeRequest(api)) return 0

    const now = Date.now()
    const windowMs = 60000
    const oldestRequest = this.requests[api][0]
    return Math.max(0, windowMs - (now - oldestRequest))
  }
}

export const rateLimiter = new RateLimiter() 