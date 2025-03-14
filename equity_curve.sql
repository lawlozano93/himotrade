CREATE OR REPLACE FUNCTION get_equity_curve(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE (
  date text,
  value double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    SELECT date_trunc('day', start_date)::date AS date
    UNION ALL
    SELECT (date + interval '1 day')::date
    FROM dates
    WHERE date < date_trunc('day', end_date)::date
  ),
  daily_pnl AS (
    SELECT
      date_trunc('day', exit_date)::date as trade_date,
      SUM(CASE 
        WHEN side = 'long' THEN (exit_price - entry_price) * quantity
        ELSE (entry_price - exit_price) * quantity
      END) as day_pnl
    FROM trades
    WHERE status = 'closed'
      AND exit_date BETWEEN start_date AND end_date
    GROUP BY date_trunc('day', exit_date)::date
  ),
  cumulative_pnl AS (
    SELECT
      d.date,
      COALESCE(dp.day_pnl, 0) as day_pnl,
      SUM(COALESCE(dp.day_pnl, 0)) OVER (ORDER BY d.date) as cumulative_pnl
    FROM dates d
    LEFT JOIN daily_pnl dp ON dp.trade_date = d.date
  )
  SELECT
    date::text,
    10000 + cumulative_pnl as value -- Starting with initial capital of 10,000
  FROM cumulative_pnl
  ORDER BY date;
END;
$$ LANGUAGE plpgsql; 