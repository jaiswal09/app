/*
  # Medical Inventory Management System Database Schema

  1. New Tables
    - `user_profiles` - Extended user information with roles
    - `categories` - Item categories (Medical Equipment, Supplies, etc.)
    - `inventory_items` - Core inventory tracking with QR codes
    - `transactions` - Check-out/check-in transaction history
    - `maintenance_schedules` - Equipment maintenance tracking
    - `low_stock_alerts` - Automated stock level monitoring
    - `system_logs` - Debug and audit logging

  2. Security
    - Enable RLS on all tables
    - Role-based policies for Admin, Staff, and Medical Personnel
    - Secure data access based on user roles

  3. Real-time Features
    - Real-time subscriptions for inventory updates
    - Transaction monitoring and alerts
    - Stock level notifications
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles with Role Management
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'medical_personnel')),
  department text,
  phone_number text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Categories for organizing inventory
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#2563eb',
  icon text DEFAULT 'Package',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Core inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id),
  item_type text NOT NULL CHECK (item_type IN ('equipment', 'supplies', 'medications', 'consumables')),
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  max_quantity integer,
  unit_price decimal(10,2),
  location text NOT NULL,
  qr_code text UNIQUE,
  barcode text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost', 'expired', 'discontinued')),
  expiry_date date,
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  maintenance_interval_days integer,
  image_url text,
  notes text,
  serial_number text,
  manufacturer text,
  model text,
  purchase_date date,
  warranty_expiry date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Transaction tracking
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('checkout', 'checkin', 'lost', 'damaged', 'maintenance')),
  quantity integer NOT NULL,
  due_date date,
  returned_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'lost', 'damaged')),
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  location_used text,
  condition_on_return text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Maintenance scheduling
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'calibration', 'inspection')),
  scheduled_date date NOT NULL,
  completed_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  technician_id uuid REFERENCES auth.users(id),
  description text,
  cost decimal(10,2),
  notes text,
  next_maintenance_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Low stock alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  current_quantity integer NOT NULL,
  min_quantity integer NOT NULL,
  alert_level text NOT NULL CHECK (alert_level IN ('low', 'critical', 'out_of_stock')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- System logs for debugging
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_qr_code ON inventory_items(qr_code);
CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_item ON maintenance_schedules(item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON low_stock_alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status ON low_stock_alerts(status);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles - Users can read their own profile, Admin/Staff can read all
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Categories - All authenticated users can read, Admin/Staff can manage
CREATE POLICY "Authenticated users can read categories" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and Staff can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Inventory Items - Role-based access
CREATE POLICY "Authenticated users can read inventory" ON inventory_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and Staff can manage inventory" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Transactions - Users see own transactions, Admin/Staff see all
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin and Staff can read all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Authenticated users can create transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin and Staff can manage transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Maintenance Schedules - Admin/Staff only
CREATE POLICY "Admin and Staff can manage maintenance" ON maintenance_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Low Stock Alerts - Admin/Staff only
CREATE POLICY "Admin and Staff can view alerts" ON low_stock_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- System Logs - Admin only
CREATE POLICY "Admin can view system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate QR codes
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := 'QR-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_inventory_qr_code BEFORE INSERT ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION generate_qr_code();

-- Function to check low stock and create alerts
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

      -- Insert or update alert
      INSERT INTO low_stock_alerts (item_id, current_quantity, min_quantity, alert_level)
      VALUES (NEW.id, NEW.quantity, NEW.min_quantity, alert_level_val)
      ON CONFLICT (item_id) 
      DO UPDATE SET 
        current_quantity = NEW.quantity,
        alert_level = alert_level_val,
        status = 'active',
        created_at = CURRENT_TIMESTAMP
      WHERE low_stock_alerts.status = 'resolved';
    END;
  ELSE
    -- Resolve any existing alerts
    UPDATE low_stock_alerts 
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE item_id = NEW.id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_inventory_low_stock AFTER UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION check_low_stock();