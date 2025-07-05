/*
  # Fix Billing Function Variable Declaration Error
  
  This migration fixes the variable declaration issue in the billing functions
  that was causing the "column item_total_price does not exist" error.
*/

-- Drop and recreate the billing function with proper variable handling
DROP FUNCTION IF EXISTS create_bill_with_inventory_update(text, text, text, text, date, date, decimal, decimal, text, text, text);

-- Create the corrected function with proper variable declarations
CREATE OR REPLACE FUNCTION create_bill_with_inventory_update(
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_address text DEFAULT NULL,
  p_bill_date date DEFAULT CURRENT_DATE,
  p_due_date date DEFAULT NULL,
  p_tax_rate decimal DEFAULT 0,
  p_discount_amount decimal DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'draft',
  p_items text DEFAULT '[]'
)
RETURNS uuid AS $$
DECLARE
  bill_id uuid;
  item_record jsonb;
  items_array jsonb;
  current_quantity integer;
  new_quantity integer;
  bill_subtotal decimal := 0;
  bill_tax_amount decimal := 0;
  bill_total decimal := 0;
  item_total_price decimal; -- Properly declare the variable here
BEGIN
  -- Start transaction block for ACID properties
  BEGIN
    -- Parse the items JSON string
    BEGIN
      items_array := p_items::jsonb;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid JSON format for items parameter: %', p_items;
    END;
    
    -- Validate that items_array is actually an array
    IF jsonb_typeof(items_array) != 'array' THEN
      RAISE EXCEPTION 'Items parameter must be a JSON array, got: %', jsonb_typeof(items_array);
    END IF;
    
    -- Create the bill first
    INSERT INTO bills (
      customer_name, customer_email, customer_phone, customer_address,
      bill_date, due_date, tax_rate, discount_amount, notes, status,
      subtotal, tax_amount, total_amount
    ) VALUES (
      p_customer_name, p_customer_email, p_customer_phone, p_customer_address,
      p_bill_date, p_due_date, p_tax_rate, p_discount_amount, p_notes, p_status,
      0, 0, 0  -- Will be calculated after items are processed
    ) RETURNING id INTO bill_id;
    
    -- Process each item in the array
    FOR item_record IN SELECT * FROM jsonb_array_elements(items_array)
    LOOP
      -- Validate required fields in item_record
      IF NOT (item_record ? 'item_id' AND item_record ? 'quantity' AND item_record ? 'unit_price') THEN
        RAISE EXCEPTION 'Each item must have item_id, quantity, and unit_price fields';
      END IF;
      
      -- Lock the inventory item row to prevent concurrent modifications
      SELECT quantity INTO current_quantity
      FROM inventory_items 
      WHERE id = (item_record->>'item_id')::uuid
      FOR UPDATE;
      
      -- Check if item exists and has sufficient quantity
      IF current_quantity IS NULL THEN
        RAISE EXCEPTION 'Item not found: %', item_record->>'item_id';
      END IF;
      
      -- Calculate new quantity after sale
      new_quantity := current_quantity - (item_record->>'quantity')::integer;
      IF new_quantity < 0 THEN
        RAISE EXCEPTION 'Insufficient quantity for item %. Available: %, Requested: %', 
          COALESCE(item_record->>'item_name', 'Unknown'), current_quantity, (item_record->>'quantity')::integer;
      END IF;
      
      -- Update inventory quantity
      UPDATE inventory_items 
      SET quantity = new_quantity, updated_at = CURRENT_TIMESTAMP
      WHERE id = (item_record->>'item_id')::uuid;
      
      -- Calculate total price for this item (now properly declared)
      item_total_price := (item_record->>'quantity')::integer * (item_record->>'unit_price')::decimal;
      
      -- Insert bill item
      INSERT INTO bill_items (
        bill_id, item_id, item_name, item_description, 
        quantity, unit_price, total_price
      ) VALUES (
        bill_id,
        (item_record->>'item_id')::uuid,
        COALESCE(item_record->>'item_name', 'Unknown Item'),
        COALESCE(item_record->>'item_description', ''),
        (item_record->>'quantity')::integer,
        (item_record->>'unit_price')::decimal,
        item_total_price
      );
      
      -- Add to subtotal
      bill_subtotal := bill_subtotal + item_total_price;
    END LOOP;
    
    -- Calculate totals
    bill_tax_amount := bill_subtotal * (p_tax_rate / 100);
    bill_total := bill_subtotal + bill_tax_amount - COALESCE(p_discount_amount, 0);
    
    -- Update bill with calculated totals
    UPDATE bills 
    SET 
      subtotal = bill_subtotal,
      tax_amount = bill_tax_amount,
      total_amount = bill_total,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = bill_id;
    
    -- Return the bill ID
    RETURN bill_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Re-raise the exception to rollback the transaction
      RAISE;
  END;
END;
$$ language 'plpgsql';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_bill_with_inventory_update(text, text, text, text, date, date, decimal, decimal, text, text, text) TO authenticated;

-- Also fix the update function with proper variable declarations
DROP FUNCTION IF EXISTS update_bill_with_inventory_update(uuid, text, text, text, text, date, date, decimal, decimal, text, text, text);

CREATE OR REPLACE FUNCTION update_bill_with_inventory_update(
  p_bill_id uuid,
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_address text DEFAULT NULL,
  p_bill_date date DEFAULT CURRENT_DATE,
  p_due_date date DEFAULT NULL,
  p_tax_rate decimal DEFAULT 0,
  p_discount_amount decimal DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'draft',
  p_items text DEFAULT '[]'
)
RETURNS void AS $$
DECLARE
  old_item_record RECORD;
  new_item_record jsonb;
  items_array jsonb;
  current_quantity integer;
  quantity_adjustment integer;
  bill_subtotal decimal := 0;
  bill_tax_amount decimal := 0;
  bill_total decimal := 0;
  item_total_price decimal; -- Properly declare the variable here
BEGIN
  -- Start transaction block for ACID properties
  BEGIN
    -- Parse the items JSON string
    BEGIN
      items_array := p_items::jsonb;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid JSON format for items parameter: %', p_items;
    END;
    
    -- Validate that items_array is actually an array
    IF jsonb_typeof(items_array) != 'array' THEN
      RAISE EXCEPTION 'Items parameter must be a JSON array, got: %', jsonb_typeof(items_array);
    END IF;
    
    -- First, restore inventory quantities from old bill items
    FOR old_item_record IN 
      SELECT item_id, quantity 
      FROM bill_items 
      WHERE bill_id = p_bill_id AND item_id IS NOT NULL
    LOOP
      -- Add back the old quantity to inventory
      UPDATE inventory_items 
      SET quantity = quantity + old_item_record.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = old_item_record.item_id;
    END LOOP;
    
    -- Delete old bill items
    DELETE FROM bill_items WHERE bill_id = p_bill_id;
    
    -- Process new items
    FOR new_item_record IN SELECT * FROM jsonb_array_elements(items_array)
    LOOP
      -- Validate required fields
      IF NOT (new_item_record ? 'item_id' AND new_item_record ? 'quantity' AND new_item_record ? 'unit_price') THEN
        RAISE EXCEPTION 'Each item must have item_id, quantity, and unit_price fields';
      END IF;
      
      -- Lock the inventory item row to prevent concurrent modifications
      SELECT quantity INTO current_quantity
      FROM inventory_items 
      WHERE id = (new_item_record->>'item_id')::uuid
      FOR UPDATE;
      
      -- Check if item exists and has sufficient quantity
      IF current_quantity IS NULL THEN
        RAISE EXCEPTION 'Item not found: %', new_item_record->>'item_id';
      END IF;
      
      -- Calculate new quantity after sale
      quantity_adjustment := current_quantity - (new_item_record->>'quantity')::integer;
      IF quantity_adjustment < 0 THEN
        RAISE EXCEPTION 'Insufficient quantity for item %. Available: %, Requested: %', 
          COALESCE(new_item_record->>'item_name', 'Unknown'), current_quantity, (new_item_record->>'quantity')::integer;
      END IF;
      
      -- Update inventory quantity
      UPDATE inventory_items 
      SET quantity = quantity_adjustment, updated_at = CURRENT_TIMESTAMP
      WHERE id = (new_item_record->>'item_id')::uuid;
      
      -- Calculate total price for this item (now properly declared)
      item_total_price := (new_item_record->>'quantity')::integer * (new_item_record->>'unit_price')::decimal;
      
      -- Insert new bill item
      INSERT INTO bill_items (
        bill_id, item_id, item_name, item_description, 
        quantity, unit_price, total_price
      ) VALUES (
        p_bill_id,
        (new_item_record->>'item_id')::uuid,
        COALESCE(new_item_record->>'item_name', 'Unknown Item'),
        COALESCE(new_item_record->>'item_description', ''),
        (new_item_record->>'quantity')::integer,
        (new_item_record->>'unit_price')::decimal,
        item_total_price
      );
      
      -- Add to subtotal
      bill_subtotal := bill_subtotal + item_total_price;
    END LOOP;
    
    -- Calculate totals
    bill_tax_amount := bill_subtotal * (p_tax_rate / 100);
    bill_total := bill_subtotal + bill_tax_amount - COALESCE(p_discount_amount, 0);
    
    -- Update bill
    UPDATE bills 
    SET 
      customer_name = p_customer_name,
      customer_email = p_customer_email,
      customer_phone = p_customer_phone,
      customer_address = p_customer_address,
      bill_date = p_bill_date,
      due_date = p_due_date,
      tax_rate = p_tax_rate,
      discount_amount = p_discount_amount,
      notes = p_notes,
      status = p_status,
      subtotal = bill_subtotal,
      tax_amount = bill_tax_amount,
      total_amount = bill_total,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = p_bill_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Re-raise the exception to rollback the transaction
      RAISE;
  END;
END;
$$ language 'plpgsql';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_bill_with_inventory_update(uuid, text, text, text, text, date, date, decimal, decimal, text, text, text) TO authenticated;

-- Also create the delete function with proper variable declarations
CREATE OR REPLACE FUNCTION delete_bill_with_inventory_restore(
  p_bill_id uuid
)
RETURNS void AS $$
DECLARE
  old_item_record RECORD;
BEGIN
  -- Start transaction block for ACID properties
  BEGIN
    -- First, restore inventory quantities from bill items
    FOR old_item_record IN 
      SELECT item_id, quantity 
      FROM bill_items 
      WHERE bill_id = p_bill_id AND item_id IS NOT NULL
    LOOP
      -- Add back the quantity to inventory
      UPDATE inventory_items 
      SET quantity = quantity + old_item_record.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = old_item_record.item_id;
    END LOOP;
    
    -- Delete bill items first (due to foreign key constraints)
    DELETE FROM bill_items WHERE bill_id = p_bill_id;
    
    -- Delete bill payments
    DELETE FROM bill_payments WHERE bill_id = p_bill_id;
    
    -- Finally delete the bill
    DELETE FROM bills WHERE id = p_bill_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Re-raise the exception to rollback the transaction
      RAISE;
  END;
END;
$$ language 'plpgsql';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_bill_with_inventory_restore(uuid) TO authenticated;