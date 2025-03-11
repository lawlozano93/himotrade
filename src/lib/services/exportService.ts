import { supabase } from './supabase'

export const exportService = {
  async exportTrades(userId: string): Promise<string> {
    try {
      // Fetch all trades with their associated strategies
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          strategies (
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Convert trades to CSV format
      const csvRows = [
        // Header row
        [
          'Date',
          'Symbol',
          'Side',
          'Status',
          'Entry Price',
          'Exit Price',
          'Quantity',
          'Stop Loss',
          'Take Profit',
          'Strategy',
          'P&L',
          'Notes'
        ].join(','),
        // Data rows
        ...(trades || []).map(trade => {
          const pnl = trade.exit_price
            ? (trade.exit_price - trade.entry_price) * trade.quantity * (trade.side === 'long' ? 1 : -1)
            : 0

          return [
            new Date(trade.created_at).toISOString(),
            trade.symbol,
            trade.side,
            trade.status,
            trade.entry_price,
            trade.exit_price || '',
            trade.quantity,
            trade.stop_loss || '',
            trade.take_profit || '',
            trade.strategies?.name || '',
            pnl.toFixed(2),
            `"${(trade.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
          ].join(',')
        })
      ].join('\n')

      return csvRows
    } catch (error) {
      console.error('Error exporting trades:', error)
      throw error
    }
  },

  downloadCsv(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
} 