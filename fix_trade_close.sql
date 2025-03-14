-- Drop existing functions to avoid conflicts
DO $$
BEGIN
  -- Drop functions if they exist
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'close_trade_v2') THEN
    DROP FUNCTION close_trade_v2;
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'debug_get_trade_by_id') THEN
    DROP FUNCTION debug_get_trade_by_id;
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'debug_list_close_trade_functions') THEN
    DROP FUNCTION debug_list_close_trade_functions;
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'update_trade_bypass_rls') THEN
    DROP FUNCTION update_trade_bypass_rls;
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'close_trade_with_debug') THEN
    DROP FUNCTION close_trade_with_debug;
  END IF;

  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'close_trade_no_portfolio') THEN
    DROP FUNCTION close_trade_no_portfolio;
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'close_trade_safe') THEN
    DROP FUNCTION close_trade_safe;
  END IF;
END $$;

-- New function that closes a trade safely without trying to set session_replication_role
CREATE OR REPLACE FUNCTION close_trade_safe(
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
  v_count INTEGER;
  v_debug_info jsonb := '{}'::jsonb;
BEGIN
  -- Convert the exit_date from text to timestamp
  BEGIN
    v_exit_date := p_exit_date::TIMESTAMP WITH TIME ZONE;
    v_debug_info := v_debug_info || jsonb_build_object('exit_date_converted', v_exit_date);
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('exit_date_error', SQLERRM);
    RETURN json_build_object('error', 'Invalid exit date format: ' || p_exit_date, 'debug', v_debug_info);
  END;

  -- Get the trade information
  BEGIN
    SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
    v_debug_info := v_debug_info || jsonb_build_object('trade_found', v_trade IS NOT NULL);
    
    IF v_trade IS NULL THEN
      -- Try to count trades to see if the trade exists but is blocked by RLS
      EXECUTE 'SELECT COUNT(*) FROM trades WHERE id = $1' INTO v_count USING p_trade_id;
      v_debug_info := v_debug_info || jsonb_build_object('trades_count', v_count);
      
      RETURN json_build_object('error', 'Trade with ID ' || p_trade_id || ' does not exist', 'debug', v_debug_info);
    END IF;
    
    v_debug_info := v_debug_info || jsonb_build_object(
      'trade_status', v_trade.status,
      'trade_user_id', v_trade.user_id,
      'trade_portfolio_id', v_trade.portfolio_id,
      'trade_symbol', v_trade.symbol,
      'trade_side', v_trade.side,
      'trade_quantity', v_trade.quantity,
      'trade_entry_price', v_trade.entry_price
    );
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('trade_error', SQLERRM);
    RETURN json_build_object('error', 'Failed to get trade: ' || SQLERRM, 'debug', v_debug_info);
  END;
  
  IF v_trade.status = 'closed' THEN
    v_debug_info := v_debug_info || jsonb_build_object('error', 'Trade already closed');
    RETURN json_build_object('error', 'Trade with ID ' || p_trade_id || ' is already closed', 'debug', v_debug_info);
  END IF;
  
  -- Calculate the P&L
  IF v_trade.side = 'long' THEN
    v_pnl := (p_exit_price - v_trade.entry_price) * v_trade.quantity;
  ELSE
    v_pnl := (v_trade.entry_price - p_exit_price) * v_trade.quantity;
  END IF;
  
  v_debug_info := v_debug_info || jsonb_build_object('calculated_pnl', v_pnl);
  
  -- Update the trade directly
  BEGIN
    UPDATE trades
    SET 
      exit_price = p_exit_price,
      exit_date = v_exit_date,
      status = 'closed',
      pnl = v_pnl,
      updated_at = NOW()
    WHERE id = p_trade_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_debug_info := v_debug_info || jsonb_build_object('rows_updated', v_count);
    
    IF v_count = 0 THEN
      v_debug_info := v_debug_info || jsonb_build_object('error', 'No rows updated');
      RETURN json_build_object('error', 'Failed to update trade - no rows affected', 'debug', v_debug_info);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('update_error', SQLERRM);
    RETURN json_build_object('error', 'Failed to update trade: ' || SQLERRM, 'debug', v_debug_info);
  END;
  
  -- Add trade history entry
  BEGIN
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
    v_debug_info := v_debug_info || jsonb_build_object('history_added', true);
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('history_error', SQLERRM);
    -- Don't fail if just the history fails
  END;
  
  -- Fetch the updated trade
  BEGIN
    SELECT row_to_json(t) INTO v_result
    FROM (SELECT * FROM trades WHERE id = p_trade_id) t;
    
    IF v_result IS NULL THEN
      v_debug_info := v_debug_info || jsonb_build_object('error', 'Could not fetch updated trade');
      RETURN json_build_object('error', 'Could not fetch updated trade after update', 'debug', v_debug_info);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('fetch_error', SQLERRM);
    RETURN json_build_object('error', 'Failed to fetch updated trade: ' || SQLERRM, 'debug', v_debug_info);
  END;
  
  -- Return the result with debug info
  RETURN jsonb_build_object('trade', v_result, 'debug', v_debug_info)::json;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION close_trade_safe TO authenticated;

-- Other backup functions from original file
-- Function to close trades with proper timestamp conversion (backup)
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

-- Debug helper functions
CREATE OR REPLACE FUNCTION debug_list_close_trade_functions()
RETURNS TABLE (
    schema TEXT,
    function_name TEXT,
    argument_list TEXT,
    return_type TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.nspname::TEXT as schema,
        p.proname::TEXT as function_name,
        pg_get_function_arguments(p.oid)::TEXT as argument_list,
        pg_get_function_result(p.oid)::TEXT as return_type
    FROM 
        pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE 
        p.proname = 'close_trade'
    ORDER BY 
        n.nspname, 
        p.proname;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_list_close_trade_functions TO authenticated;

-- Debug function to get trade by ID (bypassing RLS)
CREATE OR REPLACE FUNCTION debug_get_trade_by_id(p_trade_id UUID)
RETURNS SETOF trades
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM trades
  WHERE id = p_trade_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_get_trade_by_id TO authenticated;

-- Check for any triggers on the trades table that might cause issues
SELECT 
    tgname AS trigger_name,
    pg_class.relname AS table_name,
    tgenabled AS enabled,
    CASE 
        WHEN tgtype & 1 = 1 THEN 'ROW' 
        ELSE 'STATEMENT' 
    END AS trigger_level,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE' 
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF' 
        ELSE 'AFTER' 
    END AS trigger_timing,
    pg_proc.proname AS function_name
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE pg_class.relname = 'trades'
ORDER BY trigger_name; 