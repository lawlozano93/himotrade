-- Create a function to calculate trading fees with updated naming
CREATE OR REPLACE FUNCTION calculate_trading_fees(
    p_price NUMERIC,
    p_quantity NUMERIC,
    p_is_buy BOOLEAN
)
RETURNS NUMERIC AS $$
DECLARE
    v_gross_value NUMERIC;
    v_commission NUMERIC;
    v_vat NUMERIC;
    v_broker_fees NUMERIC;
    v_pse_fees NUMERIC;
    v_stock_transaction_tax NUMERIC;
    v_total_fees NUMERIC;
BEGIN
    -- Calculate gross value
    v_gross_value := p_price * p_quantity;
    
    -- Calculate fees using the exact naming specified by the user
    v_commission := v_gross_value * 0.0025; -- 0.25% Commission fee
    v_vat := v_commission * 0.12; -- 12% Value Added Tax
    v_broker_fees := v_gross_value * 0.0001; -- 0.01% Broker Fees
    v_pse_fees := v_gross_value * 0.00005; -- 0.005% PSE Fees
    
    -- Add Stock Transaction Tax for sell orders only
    IF NOT p_is_buy THEN
        v_stock_transaction_tax := v_gross_value * 0.006; -- 0.6% Stock Transaction Tax
    ELSE
        v_stock_transaction_tax := 0;
    END IF;
    
    -- Calculate total fees
    v_total_fees := v_commission + v_vat + v_broker_fees + v_pse_fees + v_stock_transaction_tax;
    
    -- Log fee breakdown for debugging
    RAISE NOTICE 'Fee Breakdown for % trade of % shares at ₱%:',
        CASE WHEN p_is_buy THEN 'BUY' ELSE 'SELL' END,
        p_quantity,
        p_price;
    RAISE NOTICE 'Gross Value: ₱%', v_gross_value;
    RAISE NOTICE 'Commission (0.25%%): ₱%', v_commission;
    RAISE NOTICE 'VAT (12%% of Commission): ₱%', v_vat;
    RAISE NOTICE 'Broker Fees (0.01%%): ₱%', v_broker_fees;
    RAISE NOTICE 'PSE Fees (0.005%%): ₱%', v_pse_fees;
    IF NOT p_is_buy THEN
        RAISE NOTICE 'Stock Transaction Tax (0.6%%): ₱%', v_stock_transaction_tax;
    END IF;
    RAISE NOTICE 'Total Fees: ₱%', v_total_fees;
    
    RETURN v_total_fees;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate true P&L with updated fees
CREATE OR REPLACE FUNCTION calculate_true_pnl(
    p_entry_price NUMERIC,
    p_exit_price NUMERIC,
    p_quantity NUMERIC,
    p_side TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_gross_pnl NUMERIC;
    v_entry_fees NUMERIC;
    v_exit_fees NUMERIC;
    v_true_pnl NUMERIC;
BEGIN
    -- Calculate gross P&L without fees
    IF p_side = 'long' THEN
        v_gross_pnl := (p_exit_price - p_entry_price) * p_quantity;
    ELSE -- short
        v_gross_pnl := (p_entry_price - p_exit_price) * p_quantity;
    END IF;
    
    -- Calculate fees
    v_entry_fees := calculate_trading_fees(p_entry_price, p_quantity, TRUE); -- Buy fees
    v_exit_fees := calculate_trading_fees(p_exit_price, p_quantity, FALSE);  -- Sell fees
    
    -- True P&L is gross P&L minus fees
    v_true_pnl := v_gross_pnl - v_entry_fees - v_exit_fees;
    
    -- Log the calculations
    RAISE NOTICE 'P&L Calculation:';
    RAISE NOTICE 'Gross P&L: ₱%', v_gross_pnl;
    RAISE NOTICE 'Entry Fees: ₱%', v_entry_fees;
    RAISE NOTICE 'Exit Fees: ₱%', v_exit_fees;
    RAISE NOTICE 'Net P&L after fees: ₱%', v_true_pnl;
    
    RETURN v_true_pnl;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update portfolio balances with accurate P&L
CREATE OR REPLACE FUNCTION update_portfolio_after_trade_close()
RETURNS TRIGGER AS $$
DECLARE
    v_gross_pnl NUMERIC;
    v_entry_fees NUMERIC;
    v_exit_fees NUMERIC;
    v_true_pnl NUMERIC;
BEGIN
    -- Get the accurate P&L with fees
    v_true_pnl := calculate_true_pnl(
        NEW.entry_price,
        NEW.exit_price,
        NEW.quantity,
        NEW.side
    );
    
    -- Log the calculated values
    RAISE NOTICE 'Trade ID: %, Gross P&L: %, True P&L with fees: %', 
        NEW.id, NEW.pnl, v_true_pnl;
    
    -- Update portfolio with true P&L
    UPDATE portfolios
    SET 
        equity_value = equity_value + v_true_pnl,
        available_cash = available_cash + v_true_pnl,
        updated_at = NOW()
    WHERE id = NEW.portfolio_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check for existing trigger
DO $$
DECLARE
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trades_after_update_trigger'
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS trades_after_update_trigger ON trades;
        RAISE NOTICE 'Dropped existing trigger: trades_after_update_trigger';
    END IF;
END $$;

-- Create the trigger
CREATE TRIGGER trades_after_update_trigger
AFTER UPDATE OF status ON trades
FOR EACH ROW
WHEN (OLD.status = 'open' AND NEW.status = 'closed')
EXECUTE FUNCTION update_portfolio_after_trade_close();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Created fee calculation functions and portfolio update trigger with updated fee structure';
END $$;

-- Test the fee calculation with a sample trade
SELECT 
    'BUY' AS transaction_type,
    1.00 AS price,
    2000 AS quantity,
    calculate_trading_fees(1.00, 2000, TRUE) AS total_fees;

SELECT 
    'SELL' AS transaction_type,
    1.24 AS price,
    2000 AS quantity,
    calculate_trading_fees(1.24, 2000, FALSE) AS total_fees;

-- Test the full P&L calculation
SELECT 
    'LONG' AS trade_side,
    1.00 AS entry_price,
    1.24 AS exit_price,
    2000 AS quantity,
    (1.24 - 1.00) * 2000 AS gross_pnl,
    calculate_true_pnl(1.00, 1.24, 2000, 'long') AS net_pnl_after_fees;

-- Calculate difference to show fee impact
SELECT 
    (1.24 - 1.00) * 2000 AS gross_pnl,
    calculate_true_pnl(1.00, 1.24, 2000, 'long') AS net_pnl_after_fees,
    (1.24 - 1.00) * 2000 - calculate_true_pnl(1.00, 1.24, 2000, 'long') AS fees_impact; 