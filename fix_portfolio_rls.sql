-- Check current RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'portfolios';

-- First, check if we need to enable RLS on portfolios table
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS portfolios_insert_policy ON public.portfolios;
DROP POLICY IF EXISTS portfolios_select_policy ON public.portfolios;
DROP POLICY IF EXISTS portfolios_update_policy ON public.portfolios;
DROP POLICY IF EXISTS portfolios_delete_policy ON public.portfolios;

-- Create proper RLS policies for the portfolios table

-- Allow users to insert their own portfolios
CREATE POLICY portfolios_insert_policy ON public.portfolios
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view only their own portfolios
CREATE POLICY portfolios_select_policy ON public.portfolios
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to update only their own portfolios
CREATE POLICY portfolios_update_policy ON public.portfolios
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to delete only their own portfolios
CREATE POLICY portfolios_delete_policy ON public.portfolios
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Verify the new policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'portfolios';

-- Make sure the right grants are in place
GRANT ALL ON public.portfolios TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Updated RLS policies for portfolios table';
END $$; 