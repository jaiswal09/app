export interface UserProfile {
  id: string;
  userId: string; // FIX: Changed user_id to userId
  email: string;
  fullName: string; // FIX: Changed full_name to fullName
  role: 'admin' | 'staff' | 'medical_personnel';
  department?: string;
  phoneNumber?: string; // FIX: Changed phone_number to phoneNumber
  isActive: boolean; // FIX: Changed is_active to isActive
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isActive: boolean; // FIX: Changed is_active to isActive
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
  createdBy?: string; // FIX: Changed created_by to createdBy
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  categoryId?: string; // FIX: Changed category_id to categoryId
  category?: Category;
  itemType: 'equipment' | 'supplies' | 'medications' | 'consumables'; // FIX: Changed item_type to itemType
  quantity: number;
  minQuantity: number; // FIX: Changed min_quantity to minQuantity
  maxQuantity?: number; // FIX: Changed max_quantity to maxQuantity
  unitPrice?: number; // FIX: Changed unit_price to unitPrice
  location: string;
  qrCode?: string; // FIX: Changed qr_code to qrCode
  barcode?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'lost' | 'expired' | 'discontinued';
  expiryDate?: string; // FIX: Changed expiry_date to expiryDate
  lastMaintenance?: string; // FIX: Changed last_maintenance to lastMaintenance
  nextMaintenance?: string; // FIX: Changed next_maintenance to nextMaintenance
  maintenanceIntervalDays?: number; // FIX: Changed maintenance_interval_days to maintenanceIntervalDays
  imageUrl?: string; // FIX: Changed image_url to imageUrl
  notes?: string;
  serialNumber?: string; // FIX: Changed serial_number to serialNumber
  manufacturer?: string;
  model?: string;
  purchaseDate?: string; // FIX: Changed purchase_date to purchaseDate
  warrantyExpiry?: string; // FIX: Changed warranty_expiry to warrantyExpiry
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
  createdBy?: string; // FIX: Changed created_by to createdBy
}

export interface Transaction {
  id: string;
  itemId: string; // FIX: Changed item_id to itemId
  item?: InventoryItem;
  userId: string; // FIX: Changed user_id to userId
  user?: UserProfile;
  transactionType: 'checkout' | 'checkin' | 'lost' | 'damaged' | 'maintenance'; // FIX: Changed transaction_type to transactionType
  quantity: number;
  dueDate?: string; // FIX: Changed due_date to dueDate
  returnedDate?: string; // FIX: Changed returned_date to returnedDate
  status: 'active' | 'completed' | 'overdue' | 'lost' | 'damaged';
  notes?: string;
  approvedBy?: string; // FIX: Changed approved_by to approvedBy
  approvedAt?: string; // FIX: Changed approved_at to approvedAt
  locationUsed?: string; // FIX: Changed location_used to locationUsed
  conditionOnReturn?: string; // FIX: Changed condition_on_return to conditionOnReturn
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
}

export interface MaintenanceSchedule {
  id: string;
  itemId: string; // FIX: Changed item_id to itemId
  item?: InventoryItem;
  maintenanceType: 'preventive' | 'corrective' | 'calibration' | 'inspection'; // FIX: Changed maintenance_type to maintenanceType
  scheduledDate: string; // FIX: Changed scheduled_date to scheduledDate
  completedDate?: string; // FIX: Changed completed_date to completedDate
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  technicianId?: string; // FIX: Changed technician_id to technicianId
  technician?: UserProfile;
  description?: string;
  cost?: number;
  notes?: string;
  nextMaintenanceDate?: string; // FIX: Changed next_maintenance_date to nextMaintenanceDate
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
  createdBy?: string; // FIX: Changed created_by to createdBy
}

export interface LowStockAlert {
  id: string;
  itemId: string; // FIX: Changed item_id to itemId
  item?: InventoryItem;
  currentQuantity: number; // FIX: Changed current_quantity to currentQuantity
  minQuantity: number; // FIX: Changed min_quantity to minQuantity
  alertLevel: 'low' | 'critical' | 'out_of_stock'; // FIX: Changed alert_level to alertLevel
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string; // FIX: Changed acknowledged_by to acknowledgedBy
  acknowledgedAt?: string; // FIX: Changed acknowledged_at to acknowledgedAt
  resolvedAt?: string; // FIX: Changed resolved_at to resolvedAt
  createdAt: string; // FIX: Changed created_at to createdAt
}

export interface Bill {
  id: string;
  billNumber: string; // FIX: Changed bill_number to billNumber
  customerName: string; // FIX: Changed customer_name to customerName
  customerEmail?: string; // FIX: Changed customer_email to customerEmail
  customerPhone?: string; // FIX: Changed customer_phone to customerPhone
  customerAddress?: string; // FIX: Changed customer_address to customerAddress
  billDate: string; // FIX: Changed bill_date to billDate
  dueDate?: string; // FIX: Changed due_date to dueDate
  subtotal: number;
  taxRate: number; // FIX: Changed tax_rate to taxRate
  taxAmount: number; // FIX: Changed tax_amount to taxAmount
  discountAmount: number; // FIX: Changed discount_amount to discountAmount
  totalAmount: number; // FIX: Changed total_amount to totalAmount
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded'; // FIX: Changed payment_status to paymentStatus
  notes?: string;
  createdBy?: string; // FIX: Changed created_by to createdBy
  createdAt: string; // FIX: Changed created_at to createdAt
  updatedAt: string; // FIX: Changed updated_at to updatedAt
  items?: BillItem[];
  payments?: BillPayment[];
  creator?: UserProfile; // Added creator relationship
}

export interface BillItem {
  id: string;
  billId: string; // FIX: Changed bill_id to billId
  itemId?: string; // FIX: Changed item_id to itemId
  itemName: string; // FIX: Changed item_name to itemName
  itemDescription?: string; // FIX: Changed item_description to itemDescription
  quantity: number;
  unitPrice: number; // FIX: Changed unit_price to unitPrice
  totalPrice: number; // FIX: Changed total_price to totalPrice
  createdAt?: string; // FIX: Changed created_at to createdAt
}

export interface BillPayment {
  id: string;
  billId: string; // FIX: Changed bill_id to billId
  paymentDate: string; // FIX: Changed payment_date to paymentDate
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other'; // FIX: Changed payment_method to paymentMethod
  referenceNumber?: string; // FIX: Changed reference_number to referenceNumber
  notes?: string;
  createdBy?: string; // FIX: Changed created_by to createdBy
  createdAt: string; // FIX: Changed created_at to createdAt
  creator?: UserProfile; // Added creator relationship
}

export interface SystemLog {
  id: string;
  userId?: string; // FIX: Changed user_id to userId
  action: string;
  tableName?: string; // FIX: Changed table_name to tableName
  recordId?: string; // FIX: Changed record_id to recordId
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string; // FIX: Changed ip_address to ipAddress
  userAgent?: string; // FIX: Changed user_agent to userAgent
  createdAt: string; // FIX: Changed created_at to createdAt
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  activeTransactions: number;
  overdueItems: number;
  maintenanceDue: number;
  totalValue: number;
  recentActivity: Transaction[];
  categoryDistribution: Array<{
    category: string;
    count: number;
    value: number;
  }>;
  usageStats: Array<{
    date: string;
    checkouts: number;
    checkins: number;
  }>;
}

export interface ConnectionStatus {
  online: boolean;
  backendConnected: boolean;
  realtimeConnected: boolean;
  lastPing?: number;
  latency?: number;
}

export interface DebugInfo {
  connectionStatus: ConnectionStatus;
  apiRequests: Array<{
    id: string;
    method: string;
    url: string;
    status: number;
    duration: number;
    timestamp: string;
    error?: string;
  }>;
  realtimeEvents: Array<{
    id: string;
    type: string;
    table: string;
    eventType: string;
    timestamp: string;
    payload?: any;
  }>;
  environment: {
    backendUrl?: string;
    userId?: string;
    userRole?: string;
  };
}
