-- Check if profiles table exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Create profiles table if it doesn't exist
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      email TEXT,
      avatar_url TEXT,
      first_name TEXT,
      last_name TEXT,
      birthday DATE
    );

    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id);
    
    CREATE POLICY "Users can insert their own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  ELSE
    -- Add columns to existing table if they don't exist
    BEGIN
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END;

    BEGIN
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END;

    BEGIN
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END;

    BEGIN
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END;
    
    -- Make sure the INSERT policy exists
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    CREATE POLICY "Users can insert their own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END
$$; 