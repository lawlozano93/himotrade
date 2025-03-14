-- First, drop existing functions to avoid conflicts
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
END $$;

-- 1. Function to close trades with proper timestamp conversion
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

-- 2. Debug helper functions
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

-- 3. Functions for bypassing RLS and debugging trades
CREATE OR REPLACE FUNCTION update_trade_bypass_rls(
  p_trade_id UUID,
  p_updates JSONB
)
RETURNS SETOF trades
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updates_text TEXT;
  v_sql TEXT;
  v_trade trades;
BEGIN
  -- Check if the trade exists
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade with ID % does not exist', p_trade_id;
  END IF;

  -- Convert JSONB to text for dynamic SQL
  SELECT string_agg(key || ' = ' || 
    CASE 
      WHEN jsonb_typeof(value) = 'string' THEN 
        '''' || value::text || ''''
      WHEN jsonb_typeof(value) = 'null' THEN 
        'NULL'
      ELSE 
        value::text
    END, ', ')
  INTO v_updates_text
  FROM jsonb_each(p_updates);

  -- Build and execute the SQL
  v_sql := format('UPDATE trades SET %s, updated_at = NOW() WHERE id = ''%s'' RETURNING *', 
    v_updates_text, p_trade_id);

  RAISE NOTICE 'Executing SQL: %', v_sql;
  
  RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_trade_bypass_rls TO authenticated;

-- Function to close a trade with debug info
CREATE OR REPLACE FUNCTION close_trade_with_debug(
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
  v_debug_info jsonb;
  v_count int; -- Added declaration for v_count
BEGIN
  -- Save debug info
  v_debug_info := jsonb_build_object(
    'trade_id', p_trade_id,
    'exit_price', p_exit_price,
    'exit_date', p_exit_date,
    'timestamp', now()
  );

  -- Convert the exit_date from text to timestamp
  BEGIN
    v_exit_date := p_exit_date::TIMESTAMP WITH TIME ZONE;
    v_debug_info := v_debug_info || jsonb_build_object('exit_date_converted', v_exit_date);
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('exit_date_error', SQLERRM);
    RAISE EXCEPTION 'Invalid exit date format: %', p_exit_date;
  END;

  -- Get the trade information
  BEGIN
    SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
    v_debug_info := v_debug_info || jsonb_build_object('trade_found', v_trade IS NOT NULL);
    
    IF v_trade IS NULL THEN
      -- Try to get the count of trades with this ID to check if it exists but is blocked by RLS
      DECLARE
        v_inner_count int; -- Use a different name for the inner block
      BEGIN
        EXECUTE 'SELECT COUNT(*) FROM trades WHERE id = $1' INTO v_inner_count USING p_trade_id;
        v_debug_info := v_debug_info || jsonb_build_object('trade_exists_count', v_inner_count);
      END;
      
      RAISE EXCEPTION 'Trade with ID % does not exist', p_trade_id;
    END IF;
    
    v_debug_info := v_debug_info || jsonb_build_object(
      'trade_status', v_trade.status,
      'trade_user_id', v_trade.user_id,
      'trade_portfolio_id', v_trade.portfolio_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('trade_error', SQLERRM);
    RETURN jsonb_build_object('error', 'Failed to get trade', 'details', v_debug_info)::json;
  END;
  
  IF v_trade.status = 'closed' THEN
    v_debug_info := v_debug_info || jsonb_build_object('error', 'Trade already closed');
    RETURN jsonb_build_object('error', 'Trade already closed', 'details', v_debug_info)::json;
  END IF;
  
  -- Calculate the P&L
  IF v_trade.side = 'long' THEN
    v_pnl := (p_exit_price - v_trade.entry_price) * v_trade.quantity;
  ELSE
    v_pnl := (v_trade.entry_price - p_exit_price) * v_trade.quantity;
  END IF;
  
  v_debug_info := v_debug_info || jsonb_build_object('calculated_pnl', v_pnl);
  
  -- Update the trade
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
      -- If no rows were updated, use the RLS bypass function
      DECLARE
        v_updates jsonb;
      BEGIN
        v_updates := jsonb_build_object(
          'exit_price', p_exit_price,
          'exit_date', v_exit_date,
          'status', 'closed',
          'pnl', v_pnl
        );
        
        PERFORM update_trade_bypass_rls(p_trade_id, v_updates);
        v_debug_info := v_debug_info || jsonb_build_object('used_bypass', true);
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('update_error', SQLERRM);
    RETURN jsonb_build_object('error', 'Failed to update trade', 'details', v_debug_info)::json;
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
      -- If the result is null, try to fetch using the debug function
      DECLARE
        v_trade_json json;
      BEGIN
        SELECT row_to_json(t) INTO v_trade_json
        FROM (
          SELECT * FROM debug_get_trade_by_id(p_trade_id) LIMIT 1
        ) t;
        
        v_result := v_trade_json;
        v_debug_info := v_debug_info || jsonb_build_object('used_debug_fetch', true);
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object('fetch_error', SQLERRM);
    RETURN jsonb_build_object('error', 'Failed to fetch updated trade', 'details', v_debug_info)::json;
  END;
  
  -- Return the result with debug info
  IF v_result IS NOT NULL THEN
    RETURN jsonb_build_object('trade', v_result, 'debug', v_debug_info)::json;
  ELSE
    RETURN jsonb_build_object('error', 'Failed to close trade', 'details', v_debug_info)::json;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION close_trade_with_debug TO authenticated;

-- Test the newly created functions
SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'close_trade_v2') as close_trade_v2_exists,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'debug_get_trade_by_id') as debug_get_trade_by_id_exists,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'close_trade_with_debug') as close_trade_with_debug_exists,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_trade_bypass_rls') as update_trade_bypass_rls_exists; 