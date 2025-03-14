-- Find triggers that update portfolios when trades are closed
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

-- Check a sample of closed trades to verify P&L calculation
SELECT 
    id, 
    symbol, 
    side, 
    entry_price, 
    exit_price, 
    quantity, 
    pnl,
    (CASE 
        WHEN side = 'long' THEN (exit_price - entry_price) * quantity
        ELSE (entry_price - exit_price) * quantity
     END) AS calculated_pnl,
    (CASE 
        WHEN side = 'long' THEN (exit_price - entry_price) * quantity
        ELSE (entry_price - exit_price) * quantity
     END) - pnl AS difference
FROM trades
WHERE status = 'closed'
LIMIT 10;

-- Example fix for trade close trigger (uncomment and modify after reviewing actual trigger code)
/*
CREATE OR REPLACE FUNCTION update_portfolio_on_trade_close()
RETURNS TRIGGER AS $$
DECLARE
    v_pnl NUMERIC;
    v_fees NUMERIC;
BEGIN
    -- Calculate the true P&L including fees
    v_pnl := NEW.pnl;
    
    -- Calculate estimated fees (modify according to your fee structure)
    v_fees := (NEW.entry_price * NEW.quantity * 0.005) + (NEW.exit_price * NEW.quantity * 0.005);
    
    -- Update portfolio with PNL minus fees
    UPDATE portfolios
    SET 
        equity_value = equity_value + v_pnl,
        -- Add any other fields that need updating
        updated_at = NOW()
    WHERE id = NEW.portfolio_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/

-- Check portfolio balance discrepancy
SELECT 
    id, 
    name, 
    equity_value,
    created_at,
    updated_at
FROM portfolios 
ORDER BY updated_at DESC
LIMIT 10; 