-- Update Trade Prices SQL - Ensures current prices are present for open trades

-- 1. Create a table to store stock prices if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_prices') THEN
        CREATE TABLE stock_prices (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            symbol VARCHAR(20) NOT NULL,
            price DECIMAL(15,2) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            source VARCHAR(50)
        );
        
        -- Add index for faster queries
        CREATE INDEX idx_stock_prices_symbol ON stock_prices(symbol);
        CREATE INDEX idx_stock_prices_timestamp ON stock_prices(timestamp);
    END IF;
END
$$;

-- 2. Function to manually update current prices for all open trades
-- This can be used when real-time price feeds are not available
CREATE OR REPLACE FUNCTION update_open_trades_with_manual_price(p_symbol VARCHAR, p_price DECIMAL)
RETURNS INTEGER AS $$
DECLARE
    v_trades_updated INTEGER := 0;
BEGIN
    -- First, record the price in the stock_prices table
    INSERT INTO stock_prices (symbol, price, source)
    VALUES (p_symbol, p_price, 'manual');
    
    -- Then update all open trades with this symbol
    UPDATE trades
    SET 
        current_price = p_price,
        updated_at = NOW()
    WHERE 
        symbol = p_symbol 
        AND status = 'open';
    
    GET DIAGNOSTICS v_trades_updated = ROW_COUNT;
    
    -- Update unrealized PnL for these trades using the trigger function
    -- This only works if the trigger exists
    -- Otherwise, you'll need to run the update_all_unrealized_pnl() function
    
    RETURN v_trades_updated;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to update SPNEC specifically (based on screenshot)
-- You can call this function directly from pgAdmin or via your app
SELECT update_open_trades_with_manual_price('SPNEC', 1.24);

-- 4. Example function to create default prices for all open trades
-- that have missing current_price values
CREATE OR REPLACE FUNCTION set_default_prices_for_open_trades()
RETURNS INTEGER AS $$
DECLARE
    v_trade RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- Find all open trades with null current price
    FOR v_trade IN 
        SELECT id, symbol, entry_price
        FROM trades
        WHERE status = 'open' AND current_price IS NULL
    LOOP
        -- Set current price equal to entry price as a fallback
        UPDATE trades
        SET 
            current_price = v_trade.entry_price,
            updated_at = NOW()
        WHERE id = v_trade.id;
        
        -- Record this in the stock_prices table
        INSERT INTO stock_prices (symbol, price, source)
        VALUES (v_trade.symbol, v_trade.entry_price, 'default');
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Run this to set default prices for all open trades with missing current prices
SELECT set_default_prices_for_open_trades();

-- 6. Verbose version of manual price update for SPNEC with full error handling
DO $$
DECLARE
    v_symbol VARCHAR := 'SPNEC';
    v_price DECIMAL := 1.24;
    v_trades_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating open trades for % with price ₱%', v_symbol, v_price;
    
    -- First, record the price in the stock_prices table
    BEGIN
        INSERT INTO stock_prices (symbol, price, source)
        VALUES (v_symbol, v_price, 'manual');
        RAISE NOTICE 'Recorded current price in stock_prices table';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Warning: Failed to record price in stock_prices: %', SQLERRM;
    END;
    
    -- Then update all open trades with this symbol
    BEGIN
        UPDATE trades
        SET 
            current_price = v_price,
            updated_at = NOW()
        WHERE 
            symbol = v_symbol 
            AND status = 'open';
        
        GET DIAGNOSTICS v_trades_updated = ROW_COUNT;
        
        IF v_trades_updated > 0 THEN
            RAISE NOTICE 'Successfully updated % open trades for %', v_trades_updated, v_symbol;
        ELSE
            RAISE NOTICE 'No open trades found for %', v_symbol;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating trades: %', SQLERRM;
    END;
    
    -- Try to update the unrealized PnL if possible
    BEGIN
        PERFORM update_all_unrealized_pnl();
        RAISE NOTICE 'Updated unrealized PnL for all open trades';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Warning: Could not update unrealized PnL: %', SQLERRM;
    END;
END $$; 