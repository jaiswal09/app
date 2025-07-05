/*
  # Billing System Implementation
  
  1. New Tables
    - `bills` - Main billing records
    - `bill_items` - Individual items in each bill
    - `bill_payments` - Payment tracking for bills
  
  2. ACID Transaction Improvements
    - Add proper transaction handling for inventory updates
    - Ensure data consistency across related tables
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for billing access
*/

-- Bills table for managing invoices and billing
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bill items for individual line items in bills
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id),
  item_name text NOT NULL,
  item_description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Bill payments for tracking payments against bills
CREATE TABLE IF NOT EXISTS bill_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'other')),
  reference_number text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_item_id ON bill_items(item_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);

-- Enable Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Bills
CREATE POLICY "Admin and Staff can manage bills" ON bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and Staff can manage bill items" ON bill_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and Staff can manage bill payments" ON bill_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Function to generate bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
    NEW.bill_number := 'BILL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('bill_number_sequence')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for bill numbers
CREATE SEQUENCE IF NOT EXISTS bill_number_sequence START 1000;

-- Create trigger for bill number generation
CREATE TRIGGER generate_bill_number_trigger 
  BEFORE INSERT ON bills
  FOR EACH ROW 
  EXECUTE FUNCTION generate_bill_number();

-- Function to calculate bill totals
CREATE OR REPLACE FUNCTION calculate_bill_totals()
RETURNS TRIGGER AS $$
DECLARE
  bill_subtotal decimal(10,2);
  bill_tax_amount decimal(10,2);
  bill_total decimal(10,2);
BEGIN
  -- Calculate subtotal from bill items
  SELECT COALESCE(SUM(total_price), 0) INTO bill_subtotal
  FROM bill_items 
  WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  -- Get tax rate from bills table
  SELECT tax_rate INTO bill_tax_amount
  FROM bills 
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  -- Calculate tax amount
  bill_tax_amount := bill_subtotal * (COALESCE(bill_tax_amount, 0) / 100);
  
  -- Calculate total
  bill_total := bill_subtotal + bill_tax_amount;
  
  -- Update bills table
  UPDATE bills 
  SET 
    subtotal = bill_subtotal,
    tax_amount = bill_tax_amount,
    total_amount = bill_total - COALESCE(discount_amount, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for bill total calculation
CREATE TRIGGER calculate_bill_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON bill_items
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_bill_totals();

-- Function to update payment status based on payments
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(10,2);
  bill_total decimal(10,2);
BEGIN
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM bill_payments 
  WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  -- Get bill total
  SELECT total_amount INTO bill_total
  FROM bills 
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  -- Update payment status
  UPDATE bills 
  SET 
    payment_status = CASE 
      WHEN total_paid = 0 THEN 'pending'
      WHEN total_paid >= bill_total THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for payment status updates
CREATE TRIGGER update_payment_status_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON bill_payments
  FOR EACH ROW 
  EXECUTE FUNCTION update_payment_status();

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ACID Transaction Improvements
-- Function for safe transaction creation with inventory updates
CREATE OR REPLACE FUNCTION create_transaction_with_inventory_update(
  p_item_id uuid,
  p_user_id uuid,
  p_transaction_type text,
  p_quantity integer,
  p_due_date date DEFAULT NULL,
  p_location_used text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  transaction_id uuid;
  current_quantity integer;
  new_quantity integer;
BEGIN
  -- Start transaction block for ACID properties
  BEGIN
    -- Lock the inventory item row to prevent concurrent modifications
    SELECT quantity INTO current_quantity
    FROM inventory_items 
    WHERE id = p_item_id
    FOR UPDATE;
    
    -- Check if item exists
    IF current_quantity IS NULL THEN
      RAISE EXCEPTION 'Item not found: %', p_item_id;
    END IF;
    
    -- Calculate new quantity based on transaction type
    IF p_transaction_type = 'checkout' THEN
      new_quantity := current_quantity - p_quantity;
      IF new_quantity < 0 THEN
        RAISE EXCEPTION 'Insufficient quantity. Available: %, Requested: %', current_quantity, p_quantity;
      END IF;
    ELSIF p_transaction_type = 'checkin' THEN
      new_quantity := current_quantity + p_quantity;
    ELSE
      new_quantity := current_quantity; -- No quantity change for other types
    END IF;
    
    -- Create the transaction record
    INSERT INTO transactions (
      item_id, user_id, transaction_type, quantity, due_date, location_used, notes, status
    ) VALUES (
      p_item_id, p_user_id, p_transaction_type, p_quantity, p_due_date, p_location_used, p_notes, 'active'
    ) RETURNING id INTO transaction_id;
    
    -- Update inventory quantity if needed
    IF p_transaction_type IN ('checkout', 'checkin') THEN
      UPDATE inventory_items 
      SET quantity = new_quantity, updated_at = CURRENT_TIMESTAMP
      WHERE id = p_item_id;
    END IF;
    
    -- Return the transaction ID
    RETURN transaction_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Re-raise the exception to rollback the transaction
      RAISE;
  END;
END;
$$ language 'plpgsql';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction_with_inventory_update(uuid, uuid, text, integer, date, text, text) TO authenticated;

-- Function to get bill details with items
CREATE OR REPLACE FUNCTION get_bill_details(bill_uuid uuid)
RETURNS TABLE(
  -- Bill details
  id uuid,
  bill_number text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  bill_date date,
  due_date date,
  subtotal decimal,
  tax_rate decimal,
  tax_amount decimal,
  discount_amount decimal,
  total_amount decimal,
  status text,
  payment_status text,
  notes text,
  created_at timestamptz,
  -- Bill items as JSON
  items jsonb,
  -- Payment history as JSON
  payments jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.bill_number,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.customer_address,
    b.bill_date,
    b.due_date,
    b.subtotal,
    b.tax_rate,
    b.tax_amount,
    b.discount_amount,
    b.total_amount,
    b.status,
    b.payment_status,
    b.notes,
    b.created_at,
    -- Aggregate bill items
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', bi.id,
          'item_name', bi.item_name,
          'item_description', bi.item_description,
          'quantity', bi.quantity,
          'unit_price', bi.unit_price,
          'total_price', bi.total_price
        )
      ) FROM bill_items bi WHERE bi.bill_id = b.id),
      '[]'::jsonb
    ) as items,
    -- Aggregate payments
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', bp.id,
          'payment_date', bp.payment_date,
          'amount', bp.amount,
          'payment_method', bp.payment_method,
          'reference_number', bp.reference_number,
          'notes', bp.notes
        )
      ) FROM bill_payments bp WHERE bp.bill_id = b.id),
      '[]'::jsonb
    ) as payments
  FROM bills b
  WHERE b.id = bill_uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_bill_details(uuid) TO authenticated;