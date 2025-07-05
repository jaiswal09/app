/*
  # Fix QR Code Duplicate Key Issue
  
  This migration fixes the duplicate QR code issue by:
  1. Updating existing duplicate QR codes to be unique
  2. Improving the QR code generation function to ensure uniqueness
  3. Adding a sequence-based approach for QR code generation
*/

-- First, let's create a sequence for QR code generation
CREATE SEQUENCE IF NOT EXISTS qr_code_sequence START 1000;

-- Update the QR code generation function to ensure uniqueness
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
DECLARE
  new_qr_code text;
  counter integer := 0;
BEGIN
  IF NEW.qr_code IS NULL THEN
    -- Generate a unique QR code using sequence and timestamp
    new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
    
    -- Ensure uniqueness by checking if it already exists
    WHILE EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = new_qr_code) LOOP
      counter := counter + 1;
      new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
      
      -- Safety check to prevent infinite loop
      IF counter > 100 THEN
        new_qr_code := 'QR-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || counter;
        EXIT;
      END IF;
    END LOOP;
    
    NEW.qr_code := new_qr_code;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix existing duplicate QR codes
DO $$
DECLARE
  item_record RECORD;
  new_qr_code text;
  counter integer := 1;
BEGIN
  -- Find items with duplicate or problematic QR codes
  FOR item_record IN 
    SELECT id, qr_code 
    FROM inventory_items 
    WHERE qr_code IS NOT NULL
    ORDER BY created_at
  LOOP
    -- Check if this QR code is duplicated
    IF (SELECT COUNT(*) FROM inventory_items WHERE qr_code = item_record.qr_code) > 1 THEN
      -- Generate a new unique QR code
      new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
      
      -- Ensure it's unique
      WHILE EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = new_qr_code AND id != item_record.id) LOOP
        new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
      END LOOP;
      
      -- Update the item with the new QR code
      UPDATE inventory_items 
      SET qr_code = new_qr_code 
      WHERE id = item_record.id;
      
      RAISE NOTICE 'Updated QR code for item % from % to %', item_record.id, item_record.qr_code, new_qr_code;
    END IF;
  END LOOP;
END $$;

-- Update the trigger to use the new function
DROP TRIGGER IF EXISTS generate_inventory_qr_code ON inventory_items;
CREATE TRIGGER generate_inventory_qr_code 
  BEFORE INSERT ON inventory_items
  FOR EACH ROW 
  EXECUTE FUNCTION generate_qr_code();

-- Add a function to manually regenerate QR codes if needed
CREATE OR REPLACE FUNCTION regenerate_qr_codes()
RETURNS void AS $$
DECLARE
  item_record RECORD;
  new_qr_code text;
BEGIN
  FOR item_record IN SELECT id FROM inventory_items WHERE qr_code IS NULL LOOP
    new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
    
    WHILE EXISTS (SELECT 1 FROM inventory_items WHERE qr_code = new_qr_code) LOOP
      new_qr_code := 'QR-' || LPAD(nextval('qr_code_sequence')::text, 6, '0');
    END LOOP;
    
    UPDATE inventory_items SET qr_code = new_qr_code WHERE id = item_record.id;
  END LOOP;
END;
$$ language 'plpgsql';