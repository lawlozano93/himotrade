-- First, remove the foreign key constraint from trades table
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_strategy_id_fkey;

-- Drop the strategy column from trades table (we'll add it back as name-based)
ALTER TABLE trades DROP COLUMN IF EXISTS strategy_id;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Drop existing strategy table if it exists
DROP TABLE IF EXISTS strategies;

-- Create strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own strategies"
ON strategies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
ON strategies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
ON strategies
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
ON strategies
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX strategies_user_id_idx ON strategies(user_id);

-- Add some default strategies
INSERT INTO strategies (user_id, name, description)
SELECT 
  auth.uid(),
  name,
  description
FROM (
  VALUES 
    ('Breakout', 'Trading breakouts from key levels or patterns'),
    ('Swing', 'Medium-term trades based on trend following'),
    ('Position', 'Long-term trades based on fundamentals'),
    ('Scalping', 'Very short-term trades for small profits'),
    ('Mean Reversion', 'Trading price returns to historical average'),
    ('Momentum', 'Trading strong price movements')
) AS default_strategies(name, description)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()); 