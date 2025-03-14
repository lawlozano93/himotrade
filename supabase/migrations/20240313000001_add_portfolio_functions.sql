-- Create function to update portfolio cash
CREATE OR REPLACE FUNCTION update_portfolio_cash(
  p_portfolio_id UUID,
  p_amount DECIMAL
) RETURNS void AS $$
BEGIN
  UPDATE portfolios
  SET available_cash = available_cash + p_amount
  WHERE id = p_portfolio_id;
END;
$$ LANGUAGE plpgsql;

-- Create table for portfolio transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
); 