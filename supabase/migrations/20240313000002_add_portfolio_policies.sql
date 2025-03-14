-- Enable RLS on portfolio transactions table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'portfolio_transactions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS portfolio_transactions_select_policy ON portfolio_transactions;
DROP POLICY IF EXISTS portfolio_transactions_insert_policy ON portfolio_transactions;

-- Create policies for portfolio transactions
CREATE POLICY portfolio_transactions_select_policy
  ON portfolio_transactions
  FOR SELECT
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_transactions_insert_policy
  ON portfolio_transactions
  FOR INSERT
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  ); 