-- Create a function to calculate trading fees
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
    v_pse_fee NUMERIC;
    v_sccp_fee NUMERIC;
    v_sales_tax NUMERIC;
    v_total_fees NUMERIC;
BEGIN
    -- Calculate gross value
    v_gross_value := p_price * p_quantity;
    
    -- Calculate individual fees
    v_commission := v_gross_value * 0.0025; -- 0.25% commission
    v_vat := v_commission * 0.12; -- 12% VAT on commission
    v_pse_fee := v_gross_value * 0.00005; -- 0.005% PSE Transaction fee
    v_sccp_fee := v_gross_value * 0.0001; -- 0.01% SCCP charges
    
    -- Add sales tax for sell orders
    IF NOT p_is_buy THEN
        v_sales_tax := v_gross_value * 0.006; -- 0.6% Sales transaction tax
    ELSE
        v_sales_tax := 0;
    END IF;
    
    -- Calculate total fees
    v_total_fees := v_commission + v_vat + v_pse_fee + v_sccp_fee + v_sales_tax;
    
    RETURN v_total_fees;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate true P&L with fees
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
    v_entry_fees := calculate_trading_fees(p_entry_price, p_quantity, TRUE);
    v_exit_fees := calculate_trading_fees(p_exit_price, p_quantity, FALSE);
    
    -- True P&L is gross P&L minus fees
    v_true_pnl := v_gross_pnl - v_entry_fees - v_exit_fees;
    
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
  RAISE NOTICE 'Created fee calculation functions and portfolio update trigger';
END $$;

-- Test function with a sample trade
SELECT 
    calculate_true_pnl(1.00, 1.24, 2000, 'long') AS true_pnl_with_fees,
    (1.24 - 1.00) * 2000 AS raw_pnl,
    (1.24 - 1.00) * 2000 - calculate_trading_fees(1.00, 2000, TRUE) - calculate_trading_fees(1.24, 2000, FALSE) AS manual_calc; 