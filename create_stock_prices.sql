-- Create stock_prices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stock_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    price NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON public.stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON public.stock_prices(timestamp DESC);

-- Add RLS policies
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select
CREATE POLICY stock_prices_select_policy ON public.stock_prices
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own prices
CREATE POLICY stock_prices_insert_policy ON public.stock_prices
    FOR INSERT TO authenticated WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.stock_prices TO authenticated;

-- Insert a sample price for SPNEC (you can replace this with actual data)
INSERT INTO public.stock_prices (symbol, price, source)
VALUES ('SPNEC', 1.24, 'sample_data');

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Created stock_prices table and added sample data';
END $$; 