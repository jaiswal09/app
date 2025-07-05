/*
  # Add Utility Functions for Inventory Management
  
  This migration adds utility functions for:
  1. Safe inventory quantity updates
  2. QR code management
  3. Data consistency checks
*/

-- Function to safely update inventory quantity
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  item_id uuid,
  quantity_change integer
)
RETURNS void AS $$
BEGIN
  UPDATE inventory_items 
  SET quantity = GREATEST(0, quantity + quantity_change),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = item_id;
  
  -- The trigger will automatically handle low stock alerts
END;
$$ language 'plpgsql';

-- Function to get inventory statistics
CREATE OR REPLACE FUNCTION get_inventory_stats()
RETURNS TABLE(
  total_items bigint,
  low_stock_items bigint,
  out_of_stock_items bigint,
  total_value numeric,
  categories_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_items,
    COUNT(CASE WHEN i.quantity <= i.min_quantity THEN 1 END)::bigint as low_stock_items,
    COUNT(CASE WHEN i.quantity = 0 THEN 1 END)::bigint as out_of_stock_items,
    COALESCE(SUM(i.quantity * COALESCE(i.unit_price, 0)), 0) as total_value,
    COUNT(DISTINCT i.category_id)::bigint as categories_count
  FROM inventory_items i
  WHERE i.status != 'discontinued';
END;
$$ language 'plpgsql';

-- Function to get transaction statistics
CREATE OR REPLACE FUNCTION get_transaction_stats(days_back integer DEFAULT 30)
RETURNS TABLE(
  total_transactions bigint,
  active_checkouts bigint,
  overdue_items bigint,
  completed_returns bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_transactions,
    COUNT(CASE WHEN t.status = 'active' AND t.transaction_type = 'checkout' THEN 1 END)::bigint as active_checkouts,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END)::bigint as overdue_items,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::bigint as completed_returns
  FROM transactions t
  WHERE t.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back;
END;
$$ language 'plpgsql';

-- Function to check and update overdue transactions
CREATE OR REPLACE FUNCTION update_overdue_transactions()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE transactions 
  SET status = 'overdue'
  WHERE status = 'active' 
    AND transaction_type = 'checkout'
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ language 'plpgsql';

-- Function to clean up old system logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM system_logs 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';