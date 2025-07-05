/*
  # Update Low Stock Alerts Table
  
  This migration fixes the low stock alerts table to handle multiple alerts per item
  by adding proper constraints and updating the trigger function.
*/

-- Drop the existing constraint if it exists and add a proper unique constraint
-- that allows multiple alerts per item but prevents duplicate active alerts
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'low_stock_alerts_item_id_key' 
    AND table_name = 'low_stock_alerts'
  ) THEN
    ALTER TABLE low_stock_alerts DROP CONSTRAINT low_stock_alerts_item_id_key;
  END IF;
END $$;

-- Add a unique constraint for active alerts per item
CREATE UNIQUE INDEX IF NOT EXISTS idx_low_stock_alerts_active_item 
ON low_stock_alerts (item_id) 
WHERE status = 'active';

-- Update the low stock check function to handle the constraint properly
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

      -- Insert or update alert using ON CONFLICT with the unique index
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
$$ language 'plpgsql';

-- Recreate the trigger
DROP TRIGGER IF EXISTS check_inventory_low_stock ON inventory_items;
CREATE TRIGGER check_inventory_low_stock 
  AFTER UPDATE ON inventory_items
  FOR EACH ROW 
  EXECUTE FUNCTION check_low_stock();

-- Also trigger on INSERT to catch initial low stock items
CREATE TRIGGER check_inventory_low_stock_insert 
  AFTER INSERT ON inventory_items
  FOR EACH ROW 
  EXECUTE FUNCTION check_low_stock();