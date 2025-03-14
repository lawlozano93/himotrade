-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view trade history for trades they own" ON trade_history;
DROP POLICY IF EXISTS "Users can insert trade history for trades they own" ON trade_history;
DROP POLICY IF EXISTS "Users can update trade history for trades they own" ON trade_history;

-- Create trade_history table if not exists
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view trade history for trades they own"
ON trade_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_history.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert trade history for trades they own"
ON trade_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_history.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update trade history for trades they own"
ON trade_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_history.trade_id
    AND p.user_id = auth.uid()
  )
);

-- Create function to automatically record trade history
CREATE OR REPLACE FUNCTION record_trade_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO trade_history (trade_id, action, details)
    VALUES (
      NEW.id,
      'created',
      jsonb_build_object(
        'symbol', NEW.symbol,
        'side', NEW.side,
        'entry_price', NEW.entry_price,
        'quantity', NEW.quantity,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO trade_history (trade_id, action, details)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'closed' AND OLD.status = 'open' THEN 'closed'
        ELSE 'updated'
      END,
      jsonb_build_object(
        'symbol', NEW.symbol,
        'side', NEW.side,
        'entry_price', NEW.entry_price,
        'exit_price', NEW.exit_price,
        'quantity', NEW.quantity,
        'status', NEW.status,
        'pnl', NEW.pnl
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade history
DROP TRIGGER IF EXISTS trade_history_trigger ON trades;
CREATE TRIGGER trade_history_trigger
  AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION record_trade_history();
