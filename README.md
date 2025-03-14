# Trading Journal

A comprehensive trading journal application built with Next.js, Supabase, and Tremor charts. Track your trades, analyze your performance, and improve your trading strategy.

## Features

- 📊 Real-time analytics and performance metrics
- 📈 Interactive charts for visualizing trading patterns
- 🔐 Secure authentication with Supabase
- 📱 Responsive design for desktop and mobile
- 📝 Detailed trade logging and management
- 📈 Strategy performance tracking

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Tremor
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel (recommended)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Setup

Make sure to set up the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Database Setup

1. Run the migrations in your Supabase database:
   - Execute `migrations.sql`
   - Execute `create_strategies.sql`
   - Execute `check_trades.sql`

## Fixing Profile Table Issues

If you encounter errors with the profile data, such as "Failed to load profile data" or "JSON object requested, multiple (or no) rows returned", you need to update the Row Level Security (RLS) policies on your Supabase project.

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to the SQL Editor
3. Create a new query and paste the following SQL:

```sql
-- Drop existing policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    DROP POLICY "Users can insert their own profile" ON profiles;
  END IF;
END $$;

-- Add INSERT policy for profiles table
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure all required columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
```

4. Run the query
5. Reload your application

## Fixing RLS Security Warnings

If you see RLS (Row Level Security) warnings in your Supabase dashboard about tables without RLS enabled, you need to run the following SQL to secure your database:

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to the SQL Editor
3. Create a new query and paste the SQL from the `supabase/fix-rls-tables.sql` file or run this SQL directly:

```sql
-- For the full SQL, please see the supabase/fix-rls-tables.sql file
-- This SQL script:
-- 1. Enables RLS on the tables: trade_actions, trade_metrics, strategy_metrics, and trades
-- 2. Drops any existing policies (to prevent errors)
-- 3. Creates policies for SELECT, INSERT, UPDATE, and DELETE operations
-- 4. Ensures users can only access their own data

-- To run this manually:
DO $$ 
DECLARE
  tables_to_secure text[] := ARRAY['trade_actions', 'trade_metrics', 'strategy_metrics', 'trades'];
  table_name text;
BEGIN
  -- This is a simplified example. For the full script, see fix-rls-tables.sql
  FOREACH table_name IN ARRAY tables_to_secure
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    -- Full script includes policy creation for each table
  END LOOP;
END $$;
```

4. Verify in your Supabase dashboard that the security warnings are gone

**Note:** The script handles type conversion between UUID and integer types where needed. In particular, for the `strategies` table, it converts `auth.uid()` (UUID) to a compatible integer type since the `user_id` column in that table appears to be an integer.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
