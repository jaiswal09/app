/*
  # Fix Transaction Details View Error
  
  This migration properly handles the transaction_details view issue by:
  1. Safely dropping any existing problematic views
  2. Creating proper database relationships
  3. Ensuring PostgREST can handle the joins correctly
*/

-- Safely drop the view if it exists (without RLS issues)
DO $$
BEGIN
  -- First disable RLS on the view if it exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'transaction_details') THEN
    EXECUTE 'ALTER VIEW transaction_details DISABLE ROW LEVEL SECURITY';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if the view doesn't exist or RLS can't be disabled
    NULL;
END $$;

-- Drop any existing policies on the view
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read transaction details" ON transaction_details;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if the policy doesn't exist
    NULL;
END $$;

-- Drop the view itself
DROP VIEW IF EXISTS transaction_details;

-- Ensure we have proper indexes for efficient joins
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_lookup ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_lookup ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_lookup ON inventory_items(id);
CREATE INDEX IF NOT EXISTS idx_categories_lookup ON categories(id);

-- Create a function to get enriched transaction data
-- This approach avoids the RLS issues with views
CREATE OR REPLACE FUNCTION get_transaction_with_details(
  transaction_id uuid DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  item_id uuid,
  user_id uuid,
  transaction_type text,
  quantity integer,
  due_date date,
  returned_date timestamptz,
  status text,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  location_used text,
  condition_on_return text,
  created_at timestamptz,
  updated_at timestamptz,
  -- Item details
  item_name text,
  item_description text,
  item_location text,
  item_status text,
  -- User details
  user_full_name text,
  user_email text,
  user_role text,
  user_department text,
  -- Category details
  category_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.item_id,
    t.user_id,
    t.transaction_type,
    t.quantity,
    t.due_date,
    t.returned_date,
    t.status,
    t.notes,
    t.approved_by,
    t.approved_at,
    t.location_used,
    t.condition_on_return,
    t.created_at,
    t.updated_at,
    -- Item details
    ii.name as item_name,
    ii.description as item_description,
    ii.location as item_location,
    ii.status as item_status,
    -- User details
    up.full_name as user_full_name,
    up.email as user_email,
    up.role as user_role,
    up.department as user_department,
    -- Category details
    c.name as category_name
  FROM transactions t
  LEFT JOIN inventory_items ii ON t.item_id = ii.id
  LEFT JOIN user_profiles up ON t.user_id = up.user_id
  LEFT JOIN categories c ON ii.category_id = c.id
  WHERE (transaction_id IS NULL OR t.id = transaction_id)
    AND (
      -- User can see their own transactions
      auth.uid() = t.user_id 
      OR 
      -- Admin/Staff can see all transactions
      EXISTS (
        SELECT 1 FROM user_profiles up2
        WHERE up2.user_id = auth.uid() AND up2.role IN ('admin', 'staff')
      )
    )
  ORDER BY t.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transaction_with_details(uuid, integer) TO authenticated;

-- Create a similar function for maintenance schedules
CREATE OR REPLACE FUNCTION get_maintenance_with_details(
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  item_id uuid,
  maintenance_type text,
  scheduled_date date,
  completed_date date,
  status text,
  technician_id uuid,
  description text,
  cost decimal,
  notes text,
  next_maintenance_date date,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  -- Item details
  item_name text,
  item_description text,
  item_location text,
  -- Technician details
  technician_name text,
  technician_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.item_id,
    ms.maintenance_type,
    ms.scheduled_date,
    ms.completed_date,
    ms.status,
    ms.technician_id,
    ms.description,
    ms.cost,
    ms.notes,
    ms.next_maintenance_date,
    ms.created_at,
    ms.updated_at,
    ms.created_by,
    -- Item details
    ii.name as item_name,
    ii.description as item_description,
    ii.location as item_location,
    -- Technician details
    up.full_name as technician_name,
    up.email as technician_email
  FROM maintenance_schedules ms
  LEFT JOIN inventory_items ii ON ms.item_id = ii.id
  LEFT JOIN user_profiles up ON ms.technician_id = up.user_id
  WHERE EXISTS (
    SELECT 1 FROM user_profiles up2
    WHERE up2.user_id = auth.uid() AND up2.role IN ('admin', 'staff')
  )
  ORDER BY ms.scheduled_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_maintenance_with_details(integer) TO authenticated;

-- Update the check_low_stock function to handle any potential issues
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if quantity is below minimum
  IF NEW.quantity <= NEW.min_quantity THEN
    -- Determine alert level
    DECLARE
      alert_level_val text;
    BEGIN
      IF NEW.quantity = 0 THEN
        alert_level_val := 'out_of_stock';
      ELSIF NEW.quantity <= (NEW.min_quantity * 0.5) THEN
        alert_level_val := 'critical';
      ELSE
        alert_level_val := 'low';
      END IF;

      -- Insert or update alert using proper conflict resolution
      INSERT INTO low_stock_alerts (item_id, current_quantity, min_quantity, alert_level, status)
      VALUES (NEW.id, NEW.quantity, NEW.min_quantity, alert_level_val, 'active')
      ON CONFLICT (item_id) WHERE status = 'active'
      DO UPDATE SET 
        current_quantity = NEW.quantity,
        alert_level = alert_level_val,
        created_at = CURRENT_TIMESTAMP;
    END;
  ELSE
    -- Resolve any existing active alerts
    UPDATE low_stock_alerts 
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE item_id = NEW.id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS check_inventory_low_stock ON inventory_items;
DROP TRIGGER IF EXISTS check_inventory_low_stock_insert ON inventory_items;

CREATE TRIGGER check_inventory_low_stock 
  AFTER UPDATE ON inventory_items
  FOR EACH ROW 
  EXECUTE FUNCTION check_low_stock();

CREATE TRIGGER check_inventory_low_stock_insert 
  AFTER INSERT ON inventory_items
  FOR EACH ROW 
  EXECUTE FUNCTION check_low_stock();