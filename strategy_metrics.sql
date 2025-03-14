CREATE OR REPLACE FUNCTION get_strategy_metrics(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE (
  name text,
  total_trades bigint,
  win_rate double precision,
  profit_factor double precision,
  total_pnl double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH strategy_stats AS (
    SELECT
      s.name,
      COUNT(*) as total_trades,
      COUNT(CASE WHEN t.exit_price > t.entry_price AND t.side = 'long' 
               OR t.exit_price < t.entry_price AND t.side = 'short' THEN 1 END) as winning_trades,
      SUM(CASE WHEN t.side = 'long' THEN (t.exit_price - t.entry_price) * t.quantity
              ELSE (t.entry_price - t.exit_price) * t.quantity END) as total_pnl,
      SUM(CASE WHEN t.side = 'long' AND t.exit_price > t.entry_price 
              OR t.side = 'short' AND t.exit_price < t.entry_price
            THEN ABS((t.exit_price - t.entry_price) * t.quantity)
            ELSE 0 END) as gross_profit,
      SUM(CASE WHEN t.side = 'long' AND t.exit_price < t.entry_price 
              OR t.side = 'short' AND t.exit_price > t.entry_price
            THEN ABS((t.exit_price - t.entry_price) * t.quantity)
            ELSE 0 END) as gross_loss
    FROM trades t
    JOIN strategies s ON t.strategy_id = s.id
    WHERE t.status = 'closed'
      AND t.exit_date BETWEEN start_date AND end_date
    GROUP BY s.name
  )
  SELECT
    name,
    total_trades,
    CASE WHEN total_trades > 0 THEN winning_trades::float / total_trades ELSE 0 END as win_rate,
    CASE WHEN gross_loss > 0 THEN gross_profit / gross_loss ELSE gross_profit END as profit_factor,
    total_pnl
  FROM strategy_stats
  ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql; 