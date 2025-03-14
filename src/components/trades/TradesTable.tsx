import { Trade } from '@/lib/types/trade'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TradesTableProps {
  trades: Trade[]
  onTradeClick: (trade: Trade) => void
}

export function TradesTable({ trades, onTradeClick }: TradesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Entry Price</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>P&L</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No trades found
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => (
              <TableRow
                key={trade.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onTradeClick(trade)}
              >
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge
                    variant={trade.side === 'long' ? 'default' : 'destructive'}
                  >
                    {trade.side.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(trade.entry_price)}</TableCell>
                <TableCell>{trade.quantity}</TableCell>
                <TableCell>
                  <Badge
                    variant={trade.status === 'open' ? 'outline' : 'secondary'}
                  >
                    {trade.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {trade.status === 'closed' && trade.pnl !== null ? (
                    <span
                      className={cn(
                        'font-medium',
                        trade.pnl > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(trade.pnl)}
                    </span>
                  ) : trade.unrealized_pnl !== null ? (
                    <span
                      className={cn(
                        'font-medium',
                        trade.unrealized_pnl > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(trade.unrealized_pnl)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {new Date(trade.date).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 