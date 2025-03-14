-- Create function to calculate entry fees only (to match -37.82 in data table)
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

-- Create function to calculate all fees (to match -150.04 in trade info)
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

-- Create function to calculate unrealized P&L with current price (for open trades)
CREATE OR REPLACE FUNCTION calculate_unrealized_pnl(
    p_entry_price NUMERIC,
    p_current_price NUMERIC,
    p_quantity NUMERIC,
    p_side TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_entry_cost NUMERIC;
    v_current_value NUMERIC;
    v_entry_fees NUMERIC;
    v_unrealized_pnl NUMERIC;
BEGIN
    -- Calculate entry cost including fees
    v_entry_fees := calculate_entry_fees(p_entry_price, p_quantity);
    v_entry_cost := (p_entry_price * p_quantity) + v_entry_fees;
    
    -- Calculate current market value
    v_current_value := p_current_price * p_quantity;
    
    -- Calculate unrealized P&L (market value - entry cost)
    IF p_side = 'long' THEN
        v_unrealized_pnl := v_current_value - v_entry_cost;
    ELSE -- short
        v_unrealized_pnl := v_entry_cost - v_current_value;
    END IF;
    
    -- Round to 2 decimal places to match display
    RETURN ROUND(v_unrealized_pnl, 2);
END;
$$ LANGUAGE plpgsql;

-- Test the fee calculations with real examples from the user
SELECT 
    10000 AS shares,
    1.24 AS price,
    calculate_entry_fees(1.24, 10000) AS entry_fees,
    calculate_total_fees(1.24, 10000) AS total_fees;

-- Test the unrealized P&L calculation for their SPNEC position
SELECT 
    'SPNEC' AS symbol,
    10000 AS shares,
    1.24 AS entry_price,
    1.24 AS current_price,
    1.24 * 10000 AS gross_value,
    1.24 * 10000 + calculate_entry_fees(1.24, 10000) AS total_cost,
    1.24 * 10000 AS market_value,
    calculate_unrealized_pnl(1.24, 1.24, 10000, 'long') AS unrealized_pnl,
    -1 * calculate_entry_fees(1.24, 10000) AS data_table_pnl,
    -1 * calculate_total_fees(1.24, 10000) AS trade_info_pnl; 