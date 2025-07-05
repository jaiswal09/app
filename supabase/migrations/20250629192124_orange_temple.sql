/*
  # Fix Foreign Key Relationships
  
  This migration fixes the foreign key relationships that are missing:
  1. Add proper foreign key constraints between transactions and user_profiles
  2. Add foreign key constraints for maintenance_schedules
  3. Ensure all relationships are properly named for PostgREST
*/

-- Add foreign key constraint for transactions.user_id -> user_profiles.user_id
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_user_id_fkey' 
    AND table_name = 'transactions'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for maintenance_schedules.technician_id -> auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'maintenance_schedules_technician_id_fkey' 
    AND table_name = 'maintenance_schedules'
  ) THEN
    ALTER TABLE maintenance_schedules 
    ADD CONSTRAINT maintenance_schedules_technician_id_fkey 
    FOREIGN KEY (technician_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for maintenance_schedules.created_by -> auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'maintenance_schedules_created_by_fkey' 
    AND table_name = 'maintenance_schedules'
  ) THEN
    ALTER TABLE maintenance_schedules 
    ADD CONSTRAINT maintenance_schedules_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for low_stock_alerts.acknowledged_by -> auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'low_stock_alerts_acknowledged_by_fkey' 
    AND table_name = 'low_stock_alerts'
  ) THEN
    ALTER TABLE low_stock_alerts 
    ADD CONSTRAINT low_stock_alerts_acknowledged_by_fkey 
    FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for transactions.approved_by -> auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_approved_by_fkey' 
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create a view to help with user profile joins since PostgREST needs explicit relationships
CREATE OR REPLACE VIEW transaction_details AS
SELECT 
  t.*,
  up.full_name as user_full_name,
  up.email as user_email,
  up.role as user_role,
  up.department as user_department,
  ii.name as item_name,
  ii.description as item_description,
  ii.location as item_location,
  c.name as category_name
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.user_id
LEFT JOIN inventory_items ii ON t.item_id = ii.id
LEFT JOIN categories c ON ii.category_id = c.id;

-- Grant access to the view
GRANT SELECT ON transaction_details TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can read transaction details" ON transaction_details
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Enable RLS on the view
ALTER VIEW transaction_details ENABLE ROW LEVEL SECURITY;