CREATE OR REPLACE FUNCTION get_monthly_metrics(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE (
  date text,
  trades bigint,
  win_rate double precision,
  pnl double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_stats AS (
    SELECT
      date_trunc('month', exit_date)::date as month_date,
      COUNT(*) as total_trades,
      COUNT(CASE WHEN exit_price > entry_price AND side = 'long' 
               OR exit_price < entry_price AND side = 'short' THEN 1 END) as winning_trades,
      SUM(CASE WHEN side = 'long' THEN (exit_price - entry_price) * quantity
              ELSE (entry_price - exit_price) * quantity END) as total_pnl
    FROM trades
    WHERE status = 'closed'
      AND exit_date BETWEEN start_date AND end_date
    GROUP BY date_trunc('month', exit_date)::date
  )
  SELECT
    month_date::text as date,
    total_trades as trades,
    CASE WHEN total_trades > 0 THEN winning_trades::float / total_trades ELSE 0 END as win_rate,
    total_pnl as pnl
  FROM monthly_stats
  ORDER BY month_date DESC;
END;
$$ LANGUAGE plpgsql; 