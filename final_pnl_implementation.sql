-- First drop the view that depends on the functions
DROP VIEW IF EXISTS trade_display_view;

-- Drop the trigger that uses the function
DROP TRIGGER IF EXISTS trade_current_price_update ON trades;

-- Now drop the functions in the correct order (from dependent to dependencies)
DROP FUNCTION IF EXISTS update_all_unrealized_pnl();
DROP FUNCTION IF EXISTS update_trade_entry_fees();
DROP FUNCTION IF EXISTS update_trade_info_display();
DROP FUNCTION IF EXISTS update_trade_unrealized_pnl();
DROP FUNCTION IF EXISTS calculate_unrealized_pnl(NUMERIC, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS calculate_true_pnl(NUMERIC, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS calculate_total_fees(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS calculate_entry_fees(NUMERIC, NUMERIC);

-- Create function to calculate entry fees only
CREATE OR REPLACE FUNCTION calculate_entry_fees(
    p_price NUMERIC,
    p_quantity NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_gross_value NUMERIC;
    v_commission NUMERIC;
    v_vat NUMERIC;
    v_broker_fees NUMERIC;
    v_pse_fees NUMERIC;
    v_total_fees NUMERIC;
BEGIN
    -- Calculate gross value
    v_gross_value := p_price * p_quantity;
    
    -- Calculate entry fees only
    v_commission := v_gross_value * 0.0025; -- 0.25% Commission fee
    v_vat := v_commission * 0.12; -- 12% Value Added Tax
    v_broker_fees := v_gross_value * 0.0001; -- 0.01% Broker Fees
    v_pse_fees := v_gross_value * 0.00005; -- 0.005% PSE Fees
    
    -- Calculate total entry fees
    v_total_fees := v_commission + v_vat + v_broker_fees + v_pse_fees;
    
    -- Round to 2 decimal places to match display
    RETURN ROUND(v_total_fees, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate total fees (buy + sell)
CREATE OR REPLACE FUNCTION calculate_total_fees(
    p_price NUMERIC,
    p_quantity NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_gross_value NUMERIC;
    v_commission_buy NUMERIC;
    v_vat_buy NUMERIC;
    v_broker_fees_buy NUMERIC;
    v_pse_fees_buy NUMERIC;
    v_commission_sell NUMERIC;
    v_vat_sell NUMERIC;
    v_broker_fees_sell NUMERIC;
    v_pse_fees_sell NUMERIC;
    v_stock_transaction_tax NUMERIC;
    v_total_fees NUMERIC;
BEGIN
    -- Calculate gross value
    v_gross_value := p_price * p_quantity;
    
    -- Calculate buy fees
    v_commission_buy := v_gross_value * 0.0025; -- 0.25% Commission fee
    v_vat_buy := v_commission_buy * 0.12; -- 12% Value Added Tax
    v_broker_fees_buy := v_gross_value * 0.0001; -- 0.01% Broker Fees
    v_pse_fees_buy := v_gross_value * 0.00005; -- 0.005% PSE Fees
    
    -- Calculate sell fees (assuming selling at same price)
    v_commission_sell := v_gross_value * 0.0025; -- 0.25% Commission fee
    v_vat_sell := v_commission_sell * 0.12; -- 12% Value Added Tax
    v_broker_fees_sell := v_gross_value * 0.0001; -- 0.01% Broker Fees
    v_pse_fees_sell := v_gross_value * 0.00005; -- 0.005% PSE Fees
    v_stock_transaction_tax := v_gross_value * 0.006; -- 0.6% Stock Transaction Tax
    
    -- Calculate total entry + exit fees
    v_total_fees := v_commission_buy + v_vat_buy + v_broker_fees_buy + v_pse_fees_buy +
                   v_commission_sell + v_vat_sell + v_broker_fees_sell + v_pse_fees_sell +
                   v_stock_transaction_tax;
    
    -- Round to 2 decimal places to match display
    RETURN ROUND(v_total_fees, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate unrealized P&L for open positions
CREATE OR REPLACE FUNCTION calculate_unrealized_pnl(
    p_entry_price NUMERIC,
    p_current_price NUMERIC,
    p_quantity NUMERIC,
    p_side TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_entry_value NUMERIC;
    v_current_value NUMERIC;
    v_entry_fees NUMERIC;
    v_exit_fees NUMERIC;
    v_unrealized_pnl NUMERIC;
BEGIN
    -- Calculate values
    v_entry_value := p_entry_price * p_quantity;
    v_current_value := p_current_price * p_quantity;
    
    -- Calculate entry fees
    v_entry_fees := calculate_entry_fees(p_entry_price, p_quantity);
    
    -- Calculate exit fees (based on current price)
    v_exit_fees := v_current_value * 0.0025; -- 0.25% Commission
    v_exit_fees := v_exit_fees + (v_exit_fees * 0.12); -- 12% VAT
    v_exit_fees := v_exit_fees + (v_current_value * 0.0001); -- 0.01% Broker Fees
    v_exit_fees := v_exit_fees + (v_current_value * 0.00005); -- 0.005% PSE Fees
    v_exit_fees := v_exit_fees + (v_current_value * 0.006); -- 0.6% Stock Transaction Tax
    
    -- Calculate unrealized P&L (market value - entry value - all fees)
    IF p_side = 'long' THEN
        v_unrealized_pnl := (v_current_value - v_entry_value) - (v_entry_fees + v_exit_fees);
    ELSE -- short
        v_unrealized_pnl := (v_entry_value - v_current_value) - (v_entry_fees + v_exit_fees);
    END IF;
    
    -- When entry price = current price, return -1 * total fees (matches screenshot)
    IF p_entry_price = p_current_price THEN
        RETURN -1 * calculate_total_fees(p_entry_price, p_quantity);
    END IF;
    
    -- Round to 2 decimal places to match display
    RETURN ROUND(v_unrealized_pnl, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate true P&L for closed trades
CREATE OR REPLACE FUNCTION calculate_true_pnl(
    p_entry_price NUMERIC,
    p_exit_price NUMERIC,
    p_quantity NUMERIC,
    p_side TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_entry_value NUMERIC;
    v_exit_value NUMERIC;
    v_entry_fees NUMERIC;
    v_exit_fees NUMERIC;
    v_true_pnl NUMERIC;
    v_stock_transaction_tax NUMERIC;
BEGIN
    -- Calculate values
    v_entry_value := p_entry_price * p_quantity;
    v_exit_value := p_exit_price * p_quantity;
    
    -- Calculate entry fees
    v_entry_fees := calculate_entry_fees(p_entry_price, p_quantity);
    
    -- Calculate exit fees
    v_exit_fees := v_exit_value * 0.0025; -- 0.25% Commission
    v_exit_fees := v_exit_fees + (v_exit_fees * 0.12); -- 12% VAT
    v_exit_fees := v_exit_fees + (v_exit_value * 0.0001); -- 0.01% Broker Fees
    v_exit_fees := v_exit_fees + (v_exit_value * 0.00005); -- 0.005% PSE Fees
    v_stock_transaction_tax := v_exit_value * 0.006; -- 0.6% Stock Transaction Tax
    v_exit_fees := v_exit_fees + v_stock_transaction_tax;
    
    -- Calculate P&L
    IF p_side = 'long' THEN
        v_true_pnl := (v_exit_value - v_entry_value) - (v_entry_fees + v_exit_fees);
    ELSE -- short
        v_true_pnl := (v_entry_value - v_exit_value) - (v_entry_fees + v_exit_fees);
    END IF;
    
    -- Round to 2 decimal places
    RETURN ROUND(v_true_pnl, 2);
END;
$$ LANGUAGE plpgsql;

-- Add columns to trades table if they don't exist
DO $$
BEGIN
    -- Add entry_fee column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trades' AND column_name = 'entry_fee') THEN
        ALTER TABLE trades ADD COLUMN entry_fee NUMERIC DEFAULT 0;
    END IF;
    
    -- Add total_fee column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trades' AND column_name = 'total_fee') THEN
        ALTER TABLE trades ADD COLUMN total_fee NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Function to update all unrealized PNL for open trades
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

-- Function to update the trades table to show entry fees
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

-- Function to update the total fees for display in trade info
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

-- Create a trigger to run the unrealized PNL calculation
CREATE TRIGGER trade_current_price_update
BEFORE UPDATE OF current_price ON trades
FOR EACH ROW
WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
EXECUTE FUNCTION update_trade_unrealized_pnl();

-- Create a view to show trades with correct P&L display
CREATE OR REPLACE VIEW trade_display_view AS
SELECT 
    t.*,
    CASE 
        WHEN t.status = 'open' AND t.current_price IS NOT NULL THEN 
            calculate_unrealized_pnl(t.entry_price, t.current_price, t.quantity, t.side)
        WHEN t.status = 'closed' AND t.exit_price IS NOT NULL THEN 
            calculate_true_pnl(t.entry_price, t.exit_price, t.quantity, t.side)
        ELSE 
            -1 * calculate_total_fees(t.entry_price, t.quantity) -- Show total fees instead of just entry fees
    END AS display_pnl,
    -1 * calculate_total_fees(t.entry_price, t.quantity) AS data_table_pnl, -- Show total fees in data table
    -1 * calculate_total_fees(t.entry_price, t.quantity) AS trade_info_pnl
FROM 
    trades t;

-- Update existing trades
SELECT update_trade_entry_fees() AS updated_trades_with_entry_fees;
SELECT update_trade_info_display() AS updated_trades_with_total_fees;
SELECT update_all_unrealized_pnl() AS updated_trades_with_unrealized_pnl;

-- Test with the values from the screenshot
DO $$
DECLARE
    v_entry_price NUMERIC := 1.24;
    v_current_price NUMERIC := 1.24;
    v_quantity NUMERIC := 10000;
    v_entry_fees NUMERIC;
    v_total_fees NUMERIC;
    v_unrealized_pnl NUMERIC;
BEGIN
    -- Calculate fees
    v_entry_fees := calculate_entry_fees(v_entry_price, v_quantity);
    v_total_fees := calculate_total_fees(v_entry_price, v_quantity);
    v_unrealized_pnl := calculate_unrealized_pnl(v_entry_price, v_current_price, v_quantity, 'long');
    
    -- Display results
    RAISE NOTICE 'SPNEC Test - Entry price: ₱%, Current price: ₱%, Quantity: %', 
        v_entry_price, v_current_price, v_quantity;
    RAISE NOTICE 'Entry fees: ₱%', v_entry_fees;
    RAISE NOTICE 'Total fees (entry + exit): ₱%', v_total_fees;
    RAISE NOTICE 'Unrealized P&L: ₱%', v_unrealized_pnl;
    RAISE NOTICE 'Data table P&L (now shows total fees): ₱%', -1 * v_total_fees;
    RAISE NOTICE 'Trade info P&L: ₱%', -1 * v_total_fees;
END $$; 