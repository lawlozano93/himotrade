-- Create strategies table if it doesn't exist
CREATE TABLE IF NOT EXISTS strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_strategies_updated_at_column()
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
        WHERE tgname = 'set_strategies_updated_at'
    ) THEN
        CREATE TRIGGER set_strategies_updated_at
            BEFORE UPDATE ON strategies
            FOR EACH ROW
            EXECUTE FUNCTION update_strategies_updated_at_column();
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for users" ON strategies;
DROP POLICY IF EXISTS "Enable insert for users" ON strategies;
DROP POLICY IF EXISTS "Enable update for users" ON strategies;
DROP POLICY IF EXISTS "Enable delete for users" ON strategies;

-- Add RLS policies
CREATE POLICY "Enable read for users" ON strategies
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users" ON strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users" ON strategies
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users" ON strategies
    FOR DELETE
    USING (auth.uid() = user_id); 