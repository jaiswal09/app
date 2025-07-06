import { z } from 'zod';

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const userProfileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'staff', 'medical_personnel']).optional(),
  isActive: z.boolean().optional(),
});

// Category validation schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
});

// Inventory item validation schemas - FIX: Ensure all fields are camelCase to match frontend payload
export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(), // FIX: camelCase
  itemType: z.enum(['equipment', 'supplies', 'medications', 'consumables']), // FIX: camelCase
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  minQuantity: z.number().int().min(0, 'Minimum quantity must be non-negative'), // FIX: camelCase
  maxQuantity: z.number().int().min(0, 'Maximum quantity must be non-negative').optional(), // FIX: camelCase
  unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(), // FIX: camelCase
  location: z.string().min(1, 'Location is required'),
  barcode: z.string().optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'lost', 'expired', 'discontinued']).optional(),
  expiryDate: z.string().optional(), // FIX: camelCase
  lastMaintenance: z.string().optional(), // FIX: camelCase
  nextMaintenance: z.string().optional(), // FIX: camelCase
  maintenanceIntervalDays: z.number().int().min(1, 'Maintenance interval must be at least 1 day').optional(), // FIX: camelCase
  imageUrl: z.string().url('Invalid image URL').optional(), // FIX: camelCase
  notes: z.string().optional(),
  serialNumber: z.string().optional(), // FIX: camelCase
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(), // FIX: camelCase
  warrantyExpiry: z.string().optional(), // FIX: camelCase
});

// Transaction validation schemas - FIX: Ensure all fields are camelCase
export const transactionSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'), // FIX: camelCase
  transactionType: z.enum(['checkout', 'checkin', 'lost', 'damaged', 'maintenance']), // FIX: camelCase
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  dueDate: z.string().optional(), // FIX: camelCase
  notes: z.string().optional(),
  locationUsed: z.string().optional(), // FIX: camelCase
  conditionOnReturn: z.string().optional(), // FIX: camelCase
});

// Maintenance validation schemas - FIX: Ensure all fields are camelCase
export const maintenanceSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'), // FIX: camelCase
  maintenanceType: z.enum(['preventive', 'corrective', 'calibration', 'inspection']), // FIX: camelCase
  scheduledDate: z.string().min(1, 'Scheduled date is required'), // FIX: camelCase
  technicianId: z.string().optional(), // FIX: camelCase
  description: z.string().optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  notes: z.string().optional(),
});

// Bill validation schemas - FIX: Ensure all fields are camelCase
export const billSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'), // FIX: camelCase
  customerEmail: z.string().email('Invalid email address').optional(), // FIX: camelCase
  customerPhone: z.string().optional(), // FIX: camelCase
  customerAddress: z.string().optional(), // FIX: camelCase
  billDate: z.string().min(1, 'Bill date is required'), // FIX: camelCase
  dueDate: z.string().optional(), // FIX: camelCase
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  taxRate: z.number().min(0, 'Tax rate must be non-negative'), // FIX: camelCase
  taxAmount: z.number().min(0, 'Tax amount must be non-negative'), // FIX: camelCase
  discountAmount: z.number().min(0, 'Discount amount must be non-negative'), // FIX: camelCase
  totalAmount: z.number().min(0, 'Total amount must be non-negative'), // FIX: camelCase
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, 'Item ID is required'), // FIX: Added itemId validation
    itemName: z.string().min(1, 'Item name is required'), // FIX: camelCase
    itemDescription: z.string().optional(), // FIX: camelCase
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'), // FIX: camelCase
    totalPrice: z.number().min(0, 'Total price must be non-negative'), // FIX: camelCase
  })).min(1, 'At least one item is required'),
});

export const billPaymentSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'), // FIX: camelCase
  paymentDate: z.string().min(1, 'Payment date is required'), // FIX: camelCase
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'check', 'other']), // FIX: camelCase
  referenceNumber: z.string().optional(), // FIX: camelCase
  notes: z.string().optional(),
});
