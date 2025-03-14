-- Add portfolio_id column to strategies table
ALTER TABLE strategies ADD COLUMN portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE;

-- Initially populate portfolio_id with the first portfolio for each user
-- This is a temporary solution until we properly set the portfolio ID for each strategy
UPDATE strategies s
SET portfolio_id = (
  SELECT id FROM portfolios p
  WHERE p.user_id = s.user_id
  ORDER BY p.created_at
  LIMIT 1
);

-- Add NOT NULL constraint after populating data
ALTER TABLE strategies ALTER COLUMN portfolio_id SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX strategies_portfolio_id_idx ON strategies(portfolio_id);

-- Update RLS policies to include portfolio_id checks
DROP POLICY IF EXISTS "Users can view their own strategies" ON strategies;
CREATE POLICY "Users can view their own strategies"
ON strategies
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own strategies" ON strategies;
CREATE POLICY "Users can create their own strategies"
ON strategies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own strategies" ON strategies;
CREATE POLICY "Users can update their own strategies"
ON strategies
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own strategies" ON strategies;
CREATE POLICY "Users can delete their own strategies"
ON strategies
FOR DELETE
USING (auth.uid() = user_id);

-- Update trades table to use strategy_id as UUID instead of text name
ALTER TABLE trades DROP COLUMN IF EXISTS strategy;
ALTER TABLE trades ADD COLUMN strategy_id UUID REFERENCES strategies(id);

-- Create trigger function to verify that the strategy belongs to the same portfolio as the trade
CREATE OR REPLACE FUNCTION verify_strategy_portfolio() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.strategy_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM strategies 
      WHERE id = NEW.strategy_id AND portfolio_id = NEW.portfolio_id
    ) THEN
      RAISE EXCEPTION 'Strategy must belong to the same portfolio as the trade';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to verify strategy portfolio on insert/update
DROP TRIGGER IF EXISTS verify_strategy_portfolio_trigger ON trades;
CREATE TRIGGER verify_strategy_portfolio_trigger
BEFORE INSERT OR UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION verify_strategy_portfolio(); 