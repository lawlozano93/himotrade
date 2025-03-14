-- Create a new version of the close_trade function with a unique name
CREATE OR REPLACE FUNCTION close_trade_v2(
  p_trade_id UUID,
  p_exit_price NUMERIC,
  p_exit_date TEXT
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade trades;
  v_pnl NUMERIC;
  v_result json;
  v_exit_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Convert the exit_date from text to timestamp
  BEGIN
    v_exit_date := p_exit_date::TIMESTAMP WITH TIME ZONE;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid exit date format: %', p_exit_date;
  END;

  -- Get the trade information
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade with ID % does not exist', p_trade_id;
  END IF;
  
  IF v_trade.status = 'closed' THEN
    RAISE EXCEPTION 'Trade with ID % is already closed', p_trade_id;
  END IF;
  
  -- Calculate the P&L
  IF v_trade.side = 'long' THEN
    v_pnl := (p_exit_price - v_trade.entry_price) * v_trade.quantity;
  ELSE
    v_pnl := (v_trade.entry_price - p_exit_price) * v_trade.quantity;
  END IF;
  
  -- Update the trade
  UPDATE trades
  SET 
    exit_price = p_exit_price,
    exit_date = v_exit_date,
    status = 'closed',
    pnl = v_pnl,
    updated_at = NOW()
  WHERE id = p_trade_id;
  
  -- Add trade history entry
  INSERT INTO trade_history (
    trade_id,
    action_type,
    details
  ) VALUES (
    p_trade_id,
    'close',
    json_build_object(
      'exit_price', p_exit_price,
      'exit_date', p_exit_date,
      'pnl', v_pnl,
      'entry_price', v_trade.entry_price,
      'quantity', v_trade.quantity,
      'side', v_trade.side,
      'symbol', v_trade.symbol
    )
  );
  
  -- Fetch the updated trade
  SELECT row_to_json(t) INTO v_result
  FROM (SELECT * FROM trades WHERE id = p_trade_id) t;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION close_trade_v2 TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION close_trade_v2 IS 'Closes a trade by setting exit price, exit date, and calculating P&L. Security definer function that bypasses RLS.'; 