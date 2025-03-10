-- First, drop the not-null constraint on the old strategy column
ALTER TABLE trades
ALTER COLUMN strategy DROP NOT NULL;

-- Add missing columns to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES strategies(id),
ADD COLUMN IF NOT EXISTS stop_loss DECIMAL,
ADD COLUMN IF NOT EXISTS take_profit DECIMAL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add index on strategy_id for better performance
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON trades(strategy_id);

-- Update the trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at'
    ) THEN
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON trades
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- After migrating data, you can optionally drop the old strategy column
-- ALTER TABLE trades DROP COLUMN strategy; 