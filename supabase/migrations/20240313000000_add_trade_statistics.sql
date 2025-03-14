-- Create function to calculate trade statistics
CREATE OR REPLACE FUNCTION calculate_trade_statistics(p_portfolio_id UUID)
RETURNS TABLE (
  total_trades BIGINT,
  net_pl DECIMAL,
  accuracy DECIMAL,
  avg_win DECIMAL,
  avg_loss DECIMAL,
  avg_trade_length DECIMAL,
  edge_ratio DECIMAL,
  max_drawdown DECIMAL,
  recovery_factor DECIMAL,
  profit_factor DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH closed_trades AS (
    SELECT
      id,
      entry_price,
      exit_price,
      quantity,
      entry_date,
      exit_date,
      profit_loss,
      EXTRACT(EPOCH FROM (exit_date - entry_date)) / 86400 as trade_length_days
    FROM trades
    WHERE portfolio_id = p_portfolio_id
      AND is_closed = true
  ),
  trade_stats AS (
    SELECT
      COUNT(*) as total_trades,
      SUM(profit_loss) as net_pl,
      COUNT(CASE WHEN profit_loss > 0 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100 as accuracy,
      AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) as avg_win,
      AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) as avg_loss,
      AVG(trade_length_days) as avg_trade_length,
      ABS(AVG(CASE WHEN profit_loss > 0 THEN profit_loss END)) / NULLIF(ABS(AVG(CASE WHEN profit_loss < 0 THEN profit_loss END)), 0) as edge_ratio,
      ABS(SUM(CASE WHEN profit_loss > 0 THEN profit_loss END)) / NULLIF(ABS(SUM(CASE WHEN profit_loss < 0 THEN profit_loss END)), 0) as profit_factor
    FROM closed_trades
  ),
  drawdown_calc AS (
    SELECT
      profit_loss,
      SUM(profit_loss) OVER (ORDER BY entry_date) as cumulative_pl,
      MAX(SUM(profit_loss)) OVER (ORDER BY entry_date) as running_peak
    FROM closed_trades
  ),
  max_drawdown AS (
    SELECT
      MIN(cumulative_pl - running_peak) / NULLIF(ABS(running_peak), 0) * 100 as max_drawdown
    FROM drawdown_calc
  )
  SELECT
    ts.total_trades,
    ts.net_pl,
    ts.accuracy,
    COALESCE(ts.avg_win, 0),
    COALESCE(ts.avg_loss, 0),
    COALESCE(ts.avg_trade_length, 0),
    COALESCE(ts.edge_ratio, 0),
    COALESCE(ABS(md.max_drawdown), 0),
    CASE 
      WHEN md.max_drawdown = 0 THEN 0 
      ELSE ABS(ts.net_pl / NULLIF(md.max_drawdown, 0))
    END as recovery_factor,
    COALESCE(ts.profit_factor, 0)
  FROM trade_stats ts
  CROSS JOIN max_drawdown md;
END;
$$ LANGUAGE plpgsql; 