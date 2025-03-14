-- Function to update unrealized PNL for all open trades
CREATE OR REPLACE FUNCTION update_all_unrealized_pnl()
RETURNS INTEGER AS $$
DECLARE
    v_trade RECORD;
    v_current_price NUMERIC;
    v_unrealized_pnl NUMERIC;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all open trades
    FOR v_trade IN 
        SELECT t.id, t.entry_price, t.quantity, t.side, t.symbol, t.current_price
        FROM trades t
        WHERE t.status = 'open'
    LOOP
        -- Use the current price from the trade or get latest price
        v_current_price := v_trade.current_price;
        
        -- Skip if current price is null
        CONTINUE WHEN v_current_price IS NULL;
        
        -- Calculate the unrealized PNL
        v_unrealized_pnl := calculate_unrealized_pnl(
            v_trade.entry_price,
            v_current_price,
            v_trade.quantity,
            v_trade.side
        );
        
        -- Update the trade with the correct unrealized PNL
        UPDATE trades
        SET 
            unrealized_pnl = v_unrealized_pnl,
            updated_at = NOW()
        WHERE id = v_trade.id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update the trades table to show entry fees in the data table
CREATE OR REPLACE FUNCTION update_trade_entry_fees()
RETURNS INTEGER AS $$
DECLARE
    v_trade RECORD;
    v_entry_fees NUMERIC;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all trades
    FOR v_trade IN 
        SELECT t.id, t.entry_price, t.quantity
        FROM trades t
        WHERE t.entry_fee IS NULL OR t.entry_fee = 0
    LOOP
        -- Calculate entry fees
        v_entry_fees := calculate_entry_fees(v_trade.entry_price, v_trade.quantity);
        
        -- Update the trade with the correct entry fees
        UPDATE trades
        SET 
            entry_fee = v_entry_fees,
            updated_at = NOW()
        WHERE id = v_trade.id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate the trade P&L including all fees
CREATE OR REPLACE FUNCTION update_trade_info_display()
RETURNS INTEGER AS $$
DECLARE
    v_trade RECORD;
    v_total_fees NUMERIC;
    v_updated_count INTEGER := 0;
BEGIN
    -- Loop through all trades
    FOR v_trade IN 
        SELECT t.id, t.entry_price, t.quantity
        FROM trades t
    LOOP
        -- Calculate total fees (buy + sell)
        v_total_fees := calculate_total_fees(v_trade.entry_price, v_trade.quantity);
        
        -- Update the trade with the total fees for display in trade info
        UPDATE trades
        SET 
            total_fee = v_total_fees,
            updated_at = NOW()
        WHERE id = v_trade.id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update unrealized PNL whenever current price changes
CREATE OR REPLACE FUNCTION update_trade_unrealized_pnl()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if we have all the needed data
    IF NEW.current_price IS NOT NULL THEN
        -- Calculate the unrealized PNL
        NEW.unrealized_pnl := calculate_unrealized_pnl(
            NEW.entry_price,
            NEW.current_price,
            NEW.quantity,
            NEW.side
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unrealized PNL on current price change
CREATE TRIGGER trade_current_price_update
BEFORE UPDATE OF current_price ON trades
FOR EACH ROW
WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
EXECUTE FUNCTION update_trade_unrealized_pnl();

-- Create a view to show trades with the correct P&L display
CREATE OR REPLACE VIEW trade_display_view AS
SELECT 
    t.id,
    t.symbol,
    t.entry_price,
    t.exit_price,
    t.quantity,
    t.side,
    t.status,
    t.current_price,
    t.portfolio_id,
    t.entry_date,
    t.exit_date,
    CASE 
        WHEN t.status = 'open' THEN 
            -- For open trades, show unrealized P&L
            COALESCE(t.unrealized_pnl, -1 * calculate_entry_fees(t.entry_price, t.quantity))
        ELSE 
            -- For closed trades, show realized P&L with all fees
            COALESCE(t.pnl, calculate_true_pnl(t.entry_price, t.exit_price, t.quantity, t.side))
    END AS display_pnl,
    -1 * calculate_entry_fees(t.entry_price, t.quantity) AS data_table_pnl,
    -1 * calculate_total_fees(t.entry_price, t.quantity) AS trade_info_pnl
FROM 
    trades t;

-- Run the functions to update existing trades
SELECT update_trade_entry_fees() AS updated_trades_with_entry_fees;
SELECT update_trade_info_display() AS updated_trades_with_total_fees;
SELECT update_all_unrealized_pnl() AS updated_trades_with_unrealized_pnl; 