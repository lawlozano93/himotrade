-- Function to safely apply RLS to all tables
DO $$ 
DECLARE
  tables_to_secure text[] := ARRAY['trade_actions', 'trade_metrics', 'strategy_metrics', 'trades'];
  table_name text;
BEGIN
  -- Loop through tables that need RLS enabled
  FOREACH table_name IN ARRAY tables_to_secure
  LOOP
    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop any existing policies
    IF table_name = 'trade_actions' THEN
      -- Drop trade_actions policies if they exist
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_actions' AND policyname = 'Users can view their own trade actions') THEN
        DROP POLICY "Users can view their own trade actions" ON trade_actions;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_actions' AND policyname = 'Users can insert their own trade actions') THEN
        DROP POLICY "Users can insert their own trade actions" ON trade_actions;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_actions' AND policyname = 'Users can update their own trade actions') THEN
        DROP POLICY "Users can update their own trade actions" ON trade_actions;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_actions' AND policyname = 'Users can delete their own trade actions') THEN
        DROP POLICY "Users can delete their own trade actions" ON trade_actions;
      END IF;
      
      -- Create trade_actions policies
      CREATE POLICY "Users can view their own trade actions"
      ON trade_actions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_actions.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can insert their own trade actions"
      ON trade_actions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_actions.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can update their own trade actions"
      ON trade_actions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_actions.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can delete their own trade actions"
      ON trade_actions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_actions.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
    ELSIF table_name = 'trade_metrics' THEN
      -- Drop trade_metrics policies if they exist
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_metrics' AND policyname = 'Users can view their own trade metrics') THEN
        DROP POLICY "Users can view their own trade metrics" ON trade_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_metrics' AND policyname = 'Users can insert their own trade metrics') THEN
        DROP POLICY "Users can insert their own trade metrics" ON trade_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_metrics' AND policyname = 'Users can update their own trade metrics') THEN
        DROP POLICY "Users can update their own trade metrics" ON trade_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_metrics' AND policyname = 'Users can delete their own trade metrics') THEN
        DROP POLICY "Users can delete their own trade metrics" ON trade_metrics;
      END IF;
      
      -- Create trade_metrics policies
      CREATE POLICY "Users can view their own trade metrics"
      ON trade_metrics
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_metrics.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can insert their own trade metrics"
      ON trade_metrics
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_metrics.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can update their own trade metrics"
      ON trade_metrics
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_metrics.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can delete their own trade metrics"
      ON trade_metrics
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM trades t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE t.id = trade_metrics.trade_id
          AND p.user_id = auth.uid()
        )
      );
      
    ELSIF table_name = 'strategy_metrics' THEN
      -- Drop strategy_metrics policies if they exist
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_metrics' AND policyname = 'Users can view their own strategy metrics') THEN
        DROP POLICY "Users can view their own strategy metrics" ON strategy_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_metrics' AND policyname = 'Users can insert their own strategy metrics') THEN
        DROP POLICY "Users can insert their own strategy metrics" ON strategy_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_metrics' AND policyname = 'Users can update their own strategy metrics') THEN
        DROP POLICY "Users can update their own strategy metrics" ON strategy_metrics;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_metrics' AND policyname = 'Users can delete their own strategy metrics') THEN
        DROP POLICY "Users can delete their own strategy metrics" ON strategy_metrics;
      END IF;
      
      -- Create strategy_metrics policies
      CREATE POLICY "Users can view their own strategy metrics"
      ON strategy_metrics
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM strategies s
          WHERE s.id = strategy_metrics.strategy_id
          AND s.user_id = auth.uid()::text::integer
        )
      );
      
      CREATE POLICY "Users can insert their own strategy metrics"
      ON strategy_metrics
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM strategies s
          WHERE s.id = strategy_metrics.strategy_id
          AND s.user_id = auth.uid()::text::integer
        )
      );
      
      CREATE POLICY "Users can update their own strategy metrics"
      ON strategy_metrics
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM strategies s
          WHERE s.id = strategy_metrics.strategy_id
          AND s.user_id = auth.uid()::text::integer
        )
      );
      
      CREATE POLICY "Users can delete their own strategy metrics"
      ON strategy_metrics
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM strategies s
          WHERE s.id = strategy_metrics.strategy_id
          AND s.user_id = auth.uid()::text::integer
        )
      );
      
    ELSIF table_name = 'trades' THEN
      -- Drop trades policies if they exist
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Users can view their own trades') THEN
        DROP POLICY "Users can view their own trades" ON trades;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Users can insert their own trades') THEN
        DROP POLICY "Users can insert their own trades" ON trades;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Users can update their own trades') THEN
        DROP POLICY "Users can update their own trades" ON trades;
      END IF;
      
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Users can delete their own trades') THEN
        DROP POLICY "Users can delete their own trades" ON trades;
      END IF;
      
      -- Create trades policies
      CREATE POLICY "Users can view their own trades"
      ON trades
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM portfolios p
          WHERE p.id = trades.portfolio_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can insert their own trades"
      ON trades
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM portfolios p
          WHERE p.id = trades.portfolio_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can update their own trades"
      ON trades
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM portfolios p
          WHERE p.id = trades.portfolio_id
          AND p.user_id = auth.uid()
        )
      );
      
      CREATE POLICY "Users can delete their own trades"
      ON trades
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM portfolios p
          WHERE p.id = trades.portfolio_id
          AND p.user_id = auth.uid()
        )
      );
    END IF;
  END LOOP;
END $$; 