-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, drop all existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies for trades
  DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
  DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;
  DROP POLICY IF EXISTS "Users can update their own trades" ON trades;
  DROP POLICY IF EXISTS "Users can delete their own trades" ON trades;

  -- Drop policies for portfolios
  DROP POLICY IF EXISTS "Users can view their own portfolios" ON portfolios;
  DROP POLICY IF EXISTS "Users can insert their own portfolios" ON portfolios;
  DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
  DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

  -- Drop policies for portfolio snapshots
  DROP POLICY IF EXISTS "Users can view their own portfolio snapshots" ON portfolio_snapshots;
  DROP POLICY IF EXISTS "Users can insert their own portfolio snapshots" ON portfolio_snapshots;

  -- Drop policies for portfolio transactions
  DROP POLICY IF EXISTS "Users can view their own portfolio transactions" ON portfolio_transactions;
  DROP POLICY IF EXISTS "Users can insert their own portfolio transactions" ON portfolio_transactions;

  -- Drop policies for strategies
  DROP POLICY IF EXISTS "Users can view their own strategies" ON strategies;
  DROP POLICY IF EXISTS "Users can insert their own strategies" ON strategies;
  DROP POLICY IF EXISTS "Users can update their own strategies" ON strategies;
  DROP POLICY IF EXISTS "Users can delete their own strategies" ON strategies;
END $$;

-- Create strategies table
DROP TABLE IF EXISTS strategies CASCADE;
CREATE TABLE strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

-- Create portfolios table first (since trades reference it)
DROP TABLE IF EXISTS portfolios CASCADE;
CREATE TABLE portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  available_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_deposits DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_withdrawals DECIMAL(15,2) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

-- Create trades table
DROP TABLE IF EXISTS trades CASCADE;
CREATE TABLE trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL(15,2) NOT NULL,
  exit_price DECIMAL(15,2),
  quantity DECIMAL(15,2) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  exit_date TIMESTAMP WITH TIME ZONE,
  stop_loss DECIMAL(15,2),
  take_profit DECIMAL(15,2),
  notes TEXT,
  risk_reward_ratio DECIMAL(5,2),
  pnl DECIMAL(15,2),
  asset_type VARCHAR(20) NOT NULL DEFAULT 'stocks' CHECK (asset_type IN ('stocks', 'forex', 'crypto')),
  market VARCHAR(10) CHECK (market IN ('US', 'PH')),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_price DECIMAL(15,2)
);

-- Create portfolio_snapshots table
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
CREATE TABLE portfolio_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(15,2) NOT NULL,
  cash_value DECIMAL(15,2) NOT NULL,
  equity_value DECIMAL(15,2) NOT NULL,
  realized_pnl DECIMAL(15,2) NOT NULL,
  unrealized_pnl DECIMAL(15,2) NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create portfolio_transactions table
DROP TABLE IF EXISTS portfolio_transactions CASCADE;
CREATE TABLE portfolio_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trade_remarks table
CREATE TABLE IF NOT EXISTS trade_remarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trade_images table
CREATE TABLE IF NOT EXISTS trade_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trade_history table for tracking all actions
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (
    action_type IN (
      'open',
      'close',
      'adjust_stop_loss',
      'adjust_take_profit',
      'add_position',
      'reduce_position',
      'add_remark',
      'add_image'
    )
  ),
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create function to validate trade against portfolio balance
CREATE OR REPLACE FUNCTION validate_trade_balance()
RETURNS TRIGGER AS $$
DECLARE
  portfolio_cash DECIMAL;
  trade_value DECIMAL;
BEGIN
  -- Get available cash (not current_balance)
  SELECT available_cash INTO portfolio_cash
  FROM portfolios
  WHERE id = NEW.portfolio_id;

  -- Calculate trade value
  trade_value := NEW.entry_price * NEW.quantity;

  -- Check if there's enough cash for new trade
  IF TG_OP = 'INSERT' AND trade_value > portfolio_cash THEN
    RAISE EXCEPTION 'Insufficient portfolio balance';
  END IF;

  -- For position increases
  IF TG_OP = 'UPDATE' AND NEW.quantity > OLD.quantity THEN
    trade_value := NEW.entry_price * (NEW.quantity - OLD.quantity);
    IF trade_value > portfolio_cash THEN
      RAISE EXCEPTION 'Insufficient portfolio balance for position increase';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade balance validation
CREATE TRIGGER validate_trade_balance_trigger
BEFORE INSERT OR UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION validate_trade_balance();

-- Create function to update portfolio balance
CREATE OR REPLACE FUNCTION update_portfolio_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Reduce available_cash when opening new trade and update current_balance
    UPDATE portfolios
    SET 
      available_cash = available_cash - (NEW.entry_price * NEW.quantity),
      -- current_balance stays the same since total value doesn't change when opening a position
      updated_at = NOW()
    WHERE id = NEW.portfolio_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'closed' AND OLD.status = 'open' THEN
      -- Add back to available_cash when closing trade and update current_balance with PnL
      UPDATE portfolios
      SET 
        available_cash = available_cash + (NEW.exit_price * NEW.quantity),
        current_balance = current_balance + (NEW.exit_price - NEW.entry_price) * NEW.quantity,
        realized_pnl = realized_pnl + (NEW.exit_price - NEW.entry_price) * NEW.quantity,
        updated_at = NOW()
      WHERE id = NEW.portfolio_id;
    ELSIF NEW.quantity != OLD.quantity AND NEW.status = 'open' THEN
      -- Handle position size changes
      UPDATE portfolios
      SET 
        available_cash = available_cash - (NEW.entry_price * (NEW.quantity - OLD.quantity)),
        updated_at = NOW()
      WHERE id = NEW.portfolio_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolio balance updates
CREATE TRIGGER update_portfolio_balance_trigger
AFTER INSERT OR UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_balance();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolios
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at
BEFORE UPDATE ON portfolios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strategies
CREATE POLICY "Users can view their own strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
  ON strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON strategies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for portfolios
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios"
  ON portfolios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON portfolios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for trades
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for portfolio snapshots
CREATE POLICY "Users can view their own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_snapshots.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own portfolio snapshots"
  ON portfolio_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_snapshots.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

-- Create RLS policies for portfolio transactions
CREATE POLICY "Users can view their own portfolio transactions"
  ON portfolio_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_transactions.portfolio_id
    AND portfolios.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own portfolio transactions"
  ON portfolio_transactions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_transactions.portfolio_id
    AND portfolios.user_id = auth.uid()
  )); 