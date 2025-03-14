CREATE OR REPLACE FUNCTION get_performance_metrics(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  strategy_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_trades bigint,
  winning_trades bigint,
  win_rate double precision,
  profit_factor double precision,
  average_rr double precision,
  max_drawdown double precision,
  sharpe_ratio double precision,
  net_pnl double precision,
  net_pnl_percentage double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH trade_metrics AS (
    SELECT
      COUNT(*) as total_trades,
      COUNT(CASE WHEN exit_price > entry_price AND side = 'long' 
               OR exit_price < entry_price AND side = 'short' THEN 1 END) as winning_trades,
      AVG(CASE WHEN exit_price > entry_price AND side = 'long' 
              OR exit_price < entry_price AND side = 'short' 
            THEN ABS((exit_price - entry_price) / entry_price)
            ELSE 0 END) as avg_win_pct,
      AVG(CASE WHEN exit_price < entry_price AND side = 'long' 
              OR exit_price > entry_price AND side = 'short'
            THEN ABS((exit_price - entry_price) / entry_price)
            ELSE 0 END) as avg_loss_pct,
      SUM(CASE WHEN side = 'long' THEN (exit_price - entry_price) * quantity
                ELSE (entry_price - exit_price) * quantity END) as net_pnl,
      SUM(CASE WHEN side = 'long' AND exit_price > entry_price 
              OR side = 'short' AND exit_price < entry_price
            THEN ABS((exit_price - entry_price) * quantity)
            ELSE 0 END) as gross_profit,
      SUM(CASE WHEN side = 'long' AND exit_price < entry_price 
              OR side = 'short' AND exit_price > entry_price
            THEN ABS((exit_price - entry_price) * quantity)
            ELSE 0 END) as gross_loss,
      MAX(ABS((exit_price - entry_price) / entry_price)) as max_drawdown,
      AVG(CASE WHEN side = 'long' THEN (exit_price - entry_price) / (stop_loss - entry_price)
                ELSE (entry_price - exit_price) / (entry_price - stop_loss) END) as average_rr,
      STDDEV(CASE WHEN side = 'long' THEN (exit_price - entry_price) / entry_price
                   ELSE (entry_price - exit_price) / entry_price END) as returns_stddev
    FROM trades
    WHERE status = 'closed'
      AND exit_date BETWEEN start_date AND end_date
      AND (strategy_id IS NULL OR trades.strategy_id = strategy_id)
  )
  SELECT
    total_trades,
    winning_trades,
    CASE WHEN total_trades > 0 THEN winning_trades::float / total_trades ELSE 0 END as win_rate,
    CASE WHEN gross_loss > 0 THEN gross_profit / gross_loss ELSE gross_profit END as profit_factor,
    average_rr,
    max_drawdown,
    CASE WHEN returns_stddev > 0 
      THEN (avg_win_pct - 0.02) / returns_stddev * SQRT(252) 
      ELSE 0 
    END as sharpe_ratio,
    net_pnl,
    CASE WHEN ABS(net_pnl) > 0 THEN net_pnl / ABS(net_pnl) * 100 ELSE 0 END as net_pnl_percentage
  FROM trade_metrics;
END;
$$ LANGUAGE plpgsql; 