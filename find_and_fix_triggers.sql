-- Find triggers on the trades table
SELECT 
    tgname AS trigger_name,
    pg_class.relname AS table_name,
    pg_proc.proname AS function_name,
    pg_get_functiondef(pg_proc.oid) AS function_definition
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE pg_class.relname = 'trades'
ORDER BY trigger_name;

-- This script will help you identify which trigger function is causing the issue.
-- Once you identify the problematic function, you can either:
-- 1. Modify it to not update equity_value
-- 2. Add the missing column (recommended)

-- Example for updating a trigger function (only execute after identifying the correct function):
/*
CREATE OR REPLACE FUNCTION update_portfolio_after_trade_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Update portfolio balance but skip equity_value
    UPDATE portfolios
    SET balance = balance + NEW.pnl
    WHERE id = NEW.portfolio_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/ 