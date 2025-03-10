-- Create trades table if it doesn't exist with updated structure
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    entry_price DECIMAL NOT NULL,
    exit_price DECIMAL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    strategy_id UUID REFERENCES strategies(id),
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    stop_loss DECIMAL,
    take_profit DECIMAL,
    notes TEXT
);

-- Add constraints
ALTER TABLE trades
DROP CONSTRAINT IF EXISTS trades_side_check,
ADD CONSTRAINT trades_side_check CHECK (side IN ('long', 'short'));

ALTER TABLE trades
DROP CONSTRAINT IF EXISTS trades_status_check,
ADD CONSTRAINT trades_status_check CHECK (status IN ('open', 'closed'));

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for users" ON trades;
DROP POLICY IF EXISTS "Enable insert for users" ON trades;
DROP POLICY IF EXISTS "Enable update for users" ON trades;
DROP POLICY IF EXISTS "Enable delete for users" ON trades;

-- Add RLS policies
CREATE POLICY "Enable read for users" ON trades
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users" ON trades
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users" ON trades
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users" ON trades
    FOR DELETE
    USING (auth.uid() = user_id); 