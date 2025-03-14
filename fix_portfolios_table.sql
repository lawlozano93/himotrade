-- First, let's check what columns actually exist in the portfolios table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'portfolios' AND table_schema = 'public';

-- Add the missing equity_value column with a safe default of 0
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS equity_value NUMERIC DEFAULT 0;

-- Grant permissions to authenticated users
GRANT ALL ON portfolios TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added equity_value column to portfolios table with default value of 0';
END $$; 