-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio_snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL,
    market_value DECIMAL(15, 2) NOT NULL,
    day_pnl DECIMAL(15, 2),
    total_pnl DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    strategy_id UUID REFERENCES strategies(id),
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 2),
    average_win DECIMAL(15, 2),
    average_loss DECIMAL(15, 2),
    largest_win DECIMAL(15, 2),
    largest_loss DECIMAL(15, 2),
    profit_factor DECIMAL(10, 2),
    sharpe_ratio DECIMAL(10, 2),
    total_pnl DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_date_strategy UNIQUE (date, strategy_id)
);

-- Add strategy_id to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES strategies(id);

-- Create function to update performance metrics
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance metrics for the strategy
    INSERT INTO performance_metrics (
        date,
        strategy_id,
        total_trades,
        winning_trades,
        losing_trades,
        win_rate,
        average_win,
        average_loss,
        largest_win,
        largest_loss,
        profit_factor,
        total_pnl
    )
    SELECT
        DATE_TRUNC('day', CURRENT_TIMESTAMP),
        strategy_id,
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
        COUNT(*) FILTER (WHERE pnl < 0) as losing_trades,
        ROUND(COUNT(*) FILTER (WHERE pnl > 0)::DECIMAL / NULLIF(COUNT(*), 0), 2) as win_rate,
        ROUND(AVG(pnl) FILTER (WHERE pnl > 0), 2) as average_win,
        ROUND(AVG(pnl) FILTER (WHERE pnl < 0), 2) as average_loss,
        MAX(pnl) as largest_win,
        MIN(pnl) as largest_loss,
        ROUND(ABS(SUM(pnl) FILTER (WHERE pnl > 0)) / NULLIF(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0), 2) as profit_factor,
        SUM(pnl) as total_pnl
    FROM trades
    WHERE strategy_id = NEW.strategy_id
    GROUP BY strategy_id
    ON CONFLICT (date, strategy_id)
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        win_rate = EXCLUDED.win_rate,
        average_win = EXCLUDED.average_win,
        average_loss = EXCLUDED.average_loss,
        largest_win = EXCLUDED.largest_win,
        largest_loss = EXCLUDED.largest_loss,
        profit_factor = EXCLUDED.profit_factor,
        total_pnl = EXCLUDED.total_pnl;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update performance metrics when trades are modified
CREATE OR REPLACE TRIGGER update_performance_metrics_trigger
AFTER INSERT OR UPDATE OF pnl, strategy_id ON trades
FOR EACH ROW
EXECUTE FUNCTION update_performance_metrics(); 