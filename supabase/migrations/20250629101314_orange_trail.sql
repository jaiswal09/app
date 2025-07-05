/*
  # Seed Data for Medical Inventory Management System
  
  This migration adds comprehensive seed data including:
  1. Sample user profiles with different roles
  2. Medical categories
  3. Realistic medical inventory items
  4. Sample transactions
  5. Maintenance schedules
  
  Note: This assumes some users already exist in auth.users
*/

-- Insert Categories
INSERT INTO categories (id, name, description, color, icon) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Medical Equipment', 'Diagnostic and treatment equipment', '#2563eb', 'Stethoscope'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Surgical Supplies', 'Surgical instruments and supplies', '#dc2626', 'Scissors'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Medications', 'Pharmaceuticals and drugs', '#059669', 'Pill'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Laboratory Equipment', 'Lab equipment and testing supplies', '#7c2d12', 'TestTube'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Patient Care', 'Patient care and comfort items', '#0d9488', 'Heart'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Emergency Supplies', 'Emergency and trauma care supplies', '#ea580c', 'AlertTriangle'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Disposables', 'Single-use medical supplies', '#7c3aed', 'Trash2'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Protective Equipment', 'Personal protective equipment', '#be185d', 'Shield')
ON CONFLICT (id) DO NOTHING;

-- Insert Inventory Items
INSERT INTO inventory_items (
  id, name, description, category_id, item_type, quantity, min_quantity, max_quantity,
  unit_price, location, status, serial_number, manufacturer, model, purchase_date,
  warranty_expiry, maintenance_interval_days, notes
) VALUES
  -- Medical Equipment
  ('650e8400-e29b-41d4-a716-446655440001', 'Digital Blood Pressure Monitor', 'Automatic digital BP monitor with memory and large display', 
   '550e8400-e29b-41d4-a716-446655440001', 'equipment', 15, 5, 25, 299.99, 'Storage Room A-1', 'available', 
   'BP-2024-001', 'Omron Healthcare', 'HEM-7156T', '2024-01-15', '2027-01-15', 180, 'Calibrated quarterly'),
   
  ('650e8400-e29b-41d4-a716-446655440002', 'Pulse Oximeter', 'Fingertip pulse oximeter with LED display', 
   '550e8400-e29b-41d4-a716-446655440001', 'equipment', 8, 3, 15, 89.99, 'Nursing Station B', 'available', 
   'PO-2024-002', 'Masimo', 'MightySat Rx', '2024-02-01', '2026-02-01', 90, 'Battery replacement needed monthly'),
   
  ('650e8400-e29b-41d4-a716-446655440003', 'ECG Machine', '12-lead ECG machine with interpretation software', 
   '550e8400-e29b-41d4-a716-446655440001', 'equipment', 3, 1, 5, 8999.99, 'Cardiology Department', 'available', 
   'ECG-2024-003', 'GE Healthcare', 'MAC 2000', '2024-01-10', '2029-01-10', 365, 'Annual calibration required'),
   
  ('650e8400-e29b-41d4-a716-446655440004', 'Defibrillator', 'Automated external defibrillator with voice prompts', 
   '550e8400-e29b-41d4-a716-446655440006', 'equipment', 5, 2, 8, 2499.99, 'Emergency Department', 'available', 
   'AED-2024-004', 'Philips', 'HeartStart FRx', '2024-01-20', '2032-01-20', 30, 'Monthly battery check required'),
   
  ('650e8400-e29b-41d4-a716-446655440005', 'Ventilator', 'Mechanical ventilator for respiratory support', 
   '550e8400-e29b-41d4-a716-446655440001', 'equipment', 2, 1, 4, 35000.00, 'ICU Room 1', 'in_use', 
   'VENT-2024-005', 'Medtronic', 'Puritan Bennett 980', '2024-01-05', '2034-01-05', 90, 'Critical care equipment'),

  -- Surgical Supplies
  ('650e8400-e29b-41d4-a716-446655440010', 'Surgical Scissors', 'Stainless steel surgical scissors, curved', 
   '550e8400-e29b-41d4-a716-446655440002', 'supplies', 25, 10, 50, 45.99, 'OR Supply Cabinet', 'available', 
   'SS-2024-010', 'Aesculap', 'BC311R', '2024-01-15', NULL, NULL, 'Sterilized after each use'),
   
  ('650e8400-e29b-41d4-a716-446655440011', 'Surgical Forceps', 'Stainless steel forceps, various sizes', 
   '550e8400-e29b-41d4-a716-446655440002', 'supplies', 30, 15, 60, 32.50, 'OR Supply Cabinet', 'available', 
   'SF-2024-011', 'KLS Martin', 'Various', '2024-01-15', NULL, NULL, 'Multiple sizes available'),
   
  ('650e8400-e29b-41d4-a716-446655440012', 'Scalpel Handles', 'Reusable scalpel handles #3 and #4', 
   '550e8400-e29b-41d4-a716-446655440002', 'supplies', 40, 20, 80, 28.75, 'OR Supply Cabinet', 'available', 
   'SH-2024-012', 'Swann Morton', '#3/#4', '2024-02-01', NULL, NULL, 'Disposable blades sold separately'),

  -- Medications
  ('650e8400-e29b-41d4-a716-446655440020', 'Paracetamol 500mg', 'Pain relief and fever reduction tablets', 
   '550e8400-e29b-41d4-a716-446655440003', 'medications', 2500, 500, 5000, 0.15, 'Pharmacy Storage', 'available', 
   'PARA-2024-020', 'Generic Pharma', '500mg Tablets', '2024-01-10', NULL, NULL, 'Store in cool, dry place'),
   
  ('650e8400-e29b-41d4-a716-446655440021', 'Aspirin 325mg', 'Low-dose aspirin for cardiovascular protection', 
   '550e8400-e29b-41d4-a716-446655440003', 'medications', 1800, 300, 3000, 0.08, 'Pharmacy Storage', 'available', 
   'ASP-2024-021', 'Bayer', '325mg Tablets', '2024-01-15', NULL, NULL, 'Expiry: 12/2026'),
   
  ('650e8400-e29b-41d4-a716-446655440022', 'Normal Saline 0.9%', 'Sterile saline solution for IV administration', 
   '550e8400-e29b-41d4-a716-446655440003', 'medications', 150, 50, 300, 2.25, 'IV Fluid Storage', 'available', 
   'NS-2024-022', 'B.Braun', '500ml Bags', '2024-02-01', NULL, NULL, 'Check for leaks before use'),

  -- Laboratory Equipment
  ('650e8400-e29b-41d4-a716-446655440030', 'Digital Microscope', 'Digital microscope with 4K camera', 
   '550e8400-e29b-41d4-a716-446655440004', 'equipment', 4, 2, 6, 3200.00, 'Laboratory Section A', 'available', 
   'MIC-2024-030', 'Olympus', 'CX23', '2024-01-12', '2029-01-12', 180, 'Lens cleaning weekly'),
   
  ('650e8400-e29b-41d4-a716-446655440031', 'Centrifuge', 'High-speed laboratory centrifuge', 
   '550e8400-e29b-41d4-a716-446655440004', 'equipment', 2, 1, 3, 4500.00, 'Laboratory Section B', 'maintenance', 
   'CENT-2024-031', 'Eppendorf', '5810R', '2024-01-08', '2029-01-08', 90, 'Currently under maintenance'),
   
  ('650e8400-e29b-41d4-a716-446655440032', 'Blood Test Strips', 'Glucose test strips for blood analysis', 
   '550e8400-e29b-41d4-a716-446655440004', 'consumables', 500, 100, 1000, 0.85, 'Lab Supply Cabinet', 'available', 
   'BTS-2024-032', 'Roche', 'Accu-Chek', '2024-02-15', NULL, NULL, 'Expiry: 08/2025'),

  -- Patient Care
  ('650e8400-e29b-41d4-a716-446655440040', 'Hospital Bed', 'Electric adjustable hospital bed', 
   '550e8400-e29b-41d4-a716-446655440005', 'equipment', 25, 20, 40, 1200.00, 'Patient Rooms', 'available', 
   'BED-2024-040', 'Hill-Rom', 'P1900', '2024-01-01', '2029-01-01', 180, 'Regular motor maintenance'),
   
  ('650e8400-e29b-41d4-a716-446655440041', 'Wheelchairs', 'Standard manual wheelchairs', 
   '550e8400-e29b-41d4-a716-446655440005', 'equipment', 12, 8, 20, 185.00, 'Patient Transport', 'available', 
   'WC-2024-041', 'Invacare', 'Standard', '2024-01-10', '2029-01-10', 90, 'Tire pressure check monthly'),

  -- Disposables
  ('650e8400-e29b-41d4-a716-446655440050', 'Disposable Gloves', 'Nitrile examination gloves, powder-free', 
   '550e8400-e29b-41d4-a716-446655440007', 'consumables', 5000, 1000, 10000, 0.12, 'Supply Room', 'available', 
   'GLV-2024-050', 'Ansell', 'TouchNTuff', '2024-02-01', NULL, NULL, 'Multiple sizes available'),
   
  ('650e8400-e29b-41d4-a716-446655440051', 'Face Masks', 'Surgical face masks, 3-layer protection', 
   '550e8400-e29b-41d4-a716-446655440008', 'consumables', 2000, 500, 5000, 0.25, 'PPE Storage', 'available', 
   'MASK-2024-051', 'Kimberly-Clark', 'Level 1', '2024-02-05', NULL, NULL, 'ASTM Level 1 certified'),
   
  ('650e8400-e29b-41d4-a716-446655440052', 'Syringes 10ml', 'Disposable syringes with Luer lock', 
   '550e8400-e29b-41d4-a716-446655440007', 'consumables', 1000, 200, 2000, 0.18, 'Supply Room', 'available', 
   'SYR-2024-052', 'BD', '10ml Luer Lock', '2024-02-10', NULL, NULL, 'Sterile, single-use only')

ON CONFLICT (id) DO NOTHING;

-- Create some sample maintenance schedules (Fixed column count)
INSERT INTO maintenance_schedules (
  id, item_id, maintenance_type, scheduled_date, status, description
) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'calibration', '2024-04-15', 'scheduled', 'Quarterly calibration check for blood pressure accuracy'),
  ('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'preventive', '2024-05-10', 'scheduled', 'Annual preventive maintenance and software update'),
  ('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440004', 'inspection', '2024-03-20', 'completed', 'Monthly battery and electrode check'),
  ('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440031', 'corrective', '2024-03-10', 'in_progress', 'Repair rotor imbalance issue'),
  ('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440040', 'preventive', '2024-04-01', 'scheduled', 'Motor lubrication and electrical system check')
ON CONFLICT (id) DO NOTHING;

-- Generate some low stock alerts for demonstration
INSERT INTO low_stock_alerts (
  id, item_id, current_quantity, min_quantity, alert_level, status
) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 8, 3, 'low', 'active'),
  ('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440032', 500, 100, 'critical', 'active'),
  ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440050', 5000, 1000, 'low', 'acknowledged')
ON CONFLICT (id) DO NOTHING;

-- Create some demo user profiles (these will only work if the corresponding auth.users exist)
-- You can create these users through the Supabase Auth interface or sign-up process
INSERT INTO user_profiles (id, user_id, email, full_name, role, department, is_active) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000001', 'admin@medcenter.com', 'Dr. Sarah Johnson', 'admin', 'Administration', true),
  ('950e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000002', 'staff@medcenter.com', 'Michael Chen', 'staff', 'Inventory Management', true),
  ('950e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000003', 'doctor@medcenter.com', 'Dr. Emily Rodriguez', 'medical_personnel', 'Cardiology', true)
ON CONFLICT (user_id) DO NOTHING;

-- Note: Transaction data will be created when users actually perform check-out/check-in operations
-- This maintains realistic usage patterns and avoids creating transactions for non-existent users