import { tradeService } from '../tradeService'
import { supabase } from '../supabase'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PostgrestQueryBuilder } from '@supabase/postgrest-js'

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}))

describe('tradeService', () => {
  const mockTrade = {
    id: '123',
    user_id: 'user123',
    symbol: 'AAPL',
    type: 'stocks',
    market: 'US',
    side: 'long',
    entry_price: 150,
    exit_price: null,
    quantity: 10,
    strategy: { name: 'Test Strategy' },
    status: 'open',
    pnl: null,
    unrealized_pnl: null,
    notes: 'Test trade',
    created_at: '2024-01-01T00:00:00Z',
    asset_type: 'stocks',
    date: '2024-01-01',
    entry_date: '2024-01-01',
    exit_date: null,
    risk_reward_ratio: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTrades', () => {
    it('should fetch trades for a user', async () => {
      const mockData = [mockTrade]
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      const result = await tradeService.getTrades('user123')
      expect(result).toEqual(mockData)
    })

    it('should throw error if fetch fails', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      await expect(tradeService.getTrades('user123')).rejects.toThrow('Fetch failed')
    })
  })

  describe('closeTrade', () => {
    it('should close a trade with provided exit price and date', async () => {
      const mockExitPrice = 160
      const mockExitDate = '2024-01-02'
      const expectedPnL = (mockExitPrice - mockTrade.entry_price) * mockTrade.quantity
      const expectedTrade = {
        ...mockTrade,
        status: 'closed',
        exit_price: mockExitPrice,
        exit_date: mockExitDate,
        pnl: expectedPnL,
        unrealized_pnl: null
      }

      // Mock getTradeById
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTrade, error: null })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      // Mock updateTrade
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: expectedTrade,
          error: null
        })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      const result = await tradeService.closeTrade(mockTrade.id, mockExitPrice, mockExitDate)
      expect(result).toEqual(expectedTrade)
    })

    it('should throw error if trade not found', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      await expect(tradeService.closeTrade('123', 160, '2024-01-02')).rejects.toThrow('Trade not found')
    })

    it('should calculate PnL correctly for short trades', async () => {
      const shortTrade = { ...mockTrade, side: 'short' }
      const mockExitPrice = 140
      const mockExitDate = '2024-01-02'
      const expectedPnL = (shortTrade.entry_price - mockExitPrice) * shortTrade.quantity
      const expectedTrade = {
        ...shortTrade,
        status: 'closed',
        exit_price: mockExitPrice,
        exit_date: mockExitDate,
        pnl: expectedPnL,
        unrealized_pnl: null
      }

      // Mock getTradeById
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: shortTrade, error: null })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      // Mock updateTrade
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: expectedTrade,
          error: null
        })
      }) as unknown as PostgrestQueryBuilder<any, any, any>)

      const result = await tradeService.closeTrade(shortTrade.id, mockExitPrice, mockExitDate)
      expect(result).toEqual(expectedTrade)
    })
  })
}) 