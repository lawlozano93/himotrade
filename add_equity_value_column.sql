-- Add missing equity_value column to portfolios table
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS equity_value NUMERIC DEFAULT 0;

-- Update existing portfolios with a default value
UPDATE public.portfolios SET equity_value = balance WHERE equity_value IS NULL;

-- Grant permissions to authenticated users
GRANT ALL ON portfolios TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added equity_value column to portfolios table with default values';
END $$; 