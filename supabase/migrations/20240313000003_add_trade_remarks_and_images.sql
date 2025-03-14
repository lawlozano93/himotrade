-- Create trade_remarks table
CREATE TABLE IF NOT EXISTS trade_remarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create trade_images table
CREATE TABLE IF NOT EXISTS trade_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trade_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_images ENABLE ROW LEVEL SECURITY;

-- Create policies for trade_remarks
CREATE POLICY "Users can view their own trade remarks"
ON trade_remarks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_remarks.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert remarks for their own trades"
ON trade_remarks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_remarks.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own trade remarks"
ON trade_remarks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_remarks.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own trade remarks"
ON trade_remarks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_remarks.trade_id
    AND p.user_id = auth.uid()
  )
);

-- Create policies for trade_images
CREATE POLICY "Users can view their own trade images"
ON trade_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_images.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their own trades"
ON trade_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_images.trade_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own trade images"
ON trade_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trades t
    JOIN portfolios p ON t.portfolio_id = p.id
    WHERE t.id = trade_images.trade_id
    AND p.user_id = auth.uid()
  )
); 