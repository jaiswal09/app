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

// Inventory item validation schemas
export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  itemType: z.enum(['equipment', 'supplies', 'medications', 'consumables']),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  minQuantity: z.number().int().min(0, 'Minimum quantity must be non-negative'),
  maxQuantity: z.number().int().min(0, 'Maximum quantity must be non-negative').optional(),
  unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(),
  location: z.string().min(1, 'Location is required'),
  barcode: z.string().optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'lost', 'expired', 'discontinued']).optional(),
  expiryDate: z.string().optional(),
  lastMaintenance: z.string().optional(),
  nextMaintenance: z.string().optional(),
  maintenanceIntervalDays: z.number().int().min(1, 'Maintenance interval must be at least 1 day').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  notes: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

// Transaction validation schemas
export const transactionSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  transactionType: z.enum(['checkout', 'checkin', 'lost', 'damaged', 'maintenance']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  locationUsed: z.string().optional(),
  conditionOnReturn: z.string().optional(),
});

// Maintenance validation schemas
export const maintenanceSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  maintenanceType: z.enum(['preventive', 'corrective', 'calibration', 'inspection']),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  technicianId: z.string().optional(),
  description: z.string().optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  notes: z.string().optional(),
});

// Bill validation schemas
export const billSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address').optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  billDate: z.string().min(1, 'Bill date is required'),
  dueDate: z.string().optional(),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  taxRate: z.number().min(0, 'Tax rate must be non-negative'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative'),
  discountAmount: z.number().min(0, 'Discount amount must be non-negative'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative'),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1, 'Item name is required'),
    itemDescription: z.string().optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    totalPrice: z.number().min(0, 'Total price must be non-negative'),
  })).min(1, 'At least one item is required'),
});

export const billPaymentSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'check', 'other']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});