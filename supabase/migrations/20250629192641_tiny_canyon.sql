/*
  # Fix View RLS Error and Improve Database Relationships
  
  This migration fixes the RLS error on views and improves the database relationships
  for proper PostgREST foreign key resolution.
*/

-- Drop the problematic view and its RLS policy
DROP POLICY IF EXISTS "Users can read transaction details" ON transaction_details;
DROP VIEW IF EXISTS transaction_details;

-- Instead, let's ensure we have proper foreign key relationships that PostgREST can understand
-- The issue is that transactions.user_id references auth.users.id, but we need to join with user_profiles
-- We need to create a proper relationship path

-- First, let's check if we have the right foreign keys
DO $$
BEGIN
  -- Ensure transactions.user_id -> auth.users.id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_user_id_fkey' 
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create a function to get user profile data for transactions
CREATE OR REPLACE FUNCTION get_transaction_user_profile(user_uuid uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  role text,
  department text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.email,
    up.full_name,
    up.role,
    up.department
  FROM user_profiles up
  WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transaction_user_profile(uuid) TO authenticated;

-- Create a simpler approach: add computed columns to transactions
-- This will help PostgREST resolve the relationships properly

-- Add indexes to improve join performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Update the RLS policies to ensure proper access
-- Transactions policy should allow users to see their own transactions and admin/staff to see all
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Admin and Staff can read all transactions" ON transactions;

CREATE POLICY "Users can read transactions" ON transactions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Ensure user_profiles has proper policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON user_profiles;

CREATE POLICY "Users can read profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles up2
      WHERE up2.user_id = auth.uid() AND up2.role IN ('admin', 'staff')
    )
  );