-- Debug function to list all 'close_trade' functions in the database
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