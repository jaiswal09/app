import { useState, memo } from 'react'; // Removed React as it's not directly used
import { X, Save, Loader2 } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import type { InventoryItem, Category } from '../../types';

interface InventoryItemModalProps {
  item: InventoryItem | null;
  categories: Category[];
  onClose: () => void;
}

const InventoryItemModal = memo(({ item, categories, onClose }: InventoryItemModalProps) => {
  const { createItem, updateItem, isCreatingItem, isUpdatingItem } = useInventory();
  const isEditing = !!item;
  const isLoading = isCreatingItem || isUpdatingItem;

  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    categoryId: item?.categoryId || '', // FIX: Changed category_id to categoryId
    itemType: item?.itemType || 'supplies' as const, // FIX: Changed item_type to itemType
    quantity: item?.quantity || 0,
    minQuantity: item?.minQuantity || 0, // FIX: Changed min_quantity to minQuantity
    maxQuantity: item?.maxQuantity || 0, // FIX: Changed max_quantity to maxQuantity
    unitPrice: item?.unitPrice || 0, // FIX: Changed unit_price to unitPrice
    location: item?.location || '',
    status: item?.status || 'available' as const,
    expiryDate: item?.expiryDate || '', // FIX: Changed expiry_date to expiryDate
    serialNumber: item?.serialNumber || '', // FIX: Changed serial_number to serialNumber
    manufacturer: item?.manufacturer || '',
    model: item?.model || '',
    purchaseDate: item?.purchaseDate || '', // FIX: Changed purchase_date to purchaseDate
    warrantyExpiry: item?.warrantyExpiry || '', // FIX: Changed warranty_expiry to warrantyExpiry
    maintenanceIntervalDays: item?.maintenanceIntervalDays || 0, // FIX: Changed maintenance_interval_days to maintenanceIntervalDays
    notes: item?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // FIX: Convert all snake_case properties to camelCase for the API payload
    const data = {
      ...formData,
      quantity: Number(formData.quantity),
      minQuantity: Number(formData.minQuantity), // FIX: Changed min_quantity to minQuantity
      maxQuantity: formData.maxQuantity ? Number(formData.maxQuantity) : null, // FIX: Changed max_quantity to maxQuantity
      unitPrice: formData.unitPrice ? Number(formData.unitPrice) : null, // FIX: Changed unit_price to unitPrice
      maintenanceIntervalDays: formData.maintenanceIntervalDays ? Number(formData.maintenanceIntervalDays) : null, // FIX: Changed maintenance_interval_days to maintenanceIntervalDays
      expiryDate: formData.expiryDate || null, // FIX: Changed expiry_date to expiryDate
      purchaseDate: formData.purchaseDate || null, // FIX: Changed purchase_date to purchaseDate
      warrantyExpiry: formData.warrantyExpiry || null // FIX: Changed warranty_expiry to warrantyExpiry
    };

    if (isEditing && item) {
      updateItem({ id: item.id, updates: data });
    } else {
      // Ensure the type passed to createItem matches the Omit type in useInventory.ts
      createItem(data as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>);
    }
    
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.categoryId} // FIX: Changed category_id to categoryId
                onChange={(e) => handleInputChange('categoryId', e.target.value)} // FIX: Changed category_id to categoryId
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Type *
              </label>
              <select
                required
                value={formData.itemType} // FIX: Changed item_type to itemType
                onChange={(e) => handleInputChange('itemType', e.target.value)} // FIX: Changed item_type to itemType
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="equipment">Equipment</option>
                <option value="supplies">Supplies</option>
                <option value="medications">Medications</option>
                <option value="consumables">Consumables</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="lost">Lost</option>
                <option value="expired">Expired</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter item description"
            />
          </div>

          {/* Quantity Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minQuantity} // FIX: Changed min_quantity to minQuantity
                onChange={(e) => handleInputChange('minQuantity', e.target.value)} // FIX: Changed min_quantity to minQuantity
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxQuantity} // FIX: Changed max_quantity to maxQuantity
                onChange={(e) => handleInputChange('maxQuantity', e.target.value)} // FIX: Changed max_quantity to maxQuantity
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice} // FIX: Changed unit_price to unitPrice
                onChange={(e) => handleInputChange('unitPrice', e.target.value)} // FIX: Changed unit_price to unitPrice
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Storage Room A-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serialNumber} // FIX: Changed serial_number to serialNumber
                onChange={(e) => handleInputChange('serialNumber', e.target.value)} // FIX: Changed serial_number to serialNumber
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter serial number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter manufacturer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter model"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate} // FIX: Changed purchase_date to purchaseDate
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)} // FIX: Changed purchase_date to purchaseDate
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate} // FIX: Changed expiry_date to expiryDate
                onChange={(e) => handleInputChange('expiryDate', e.target.value)} // FIX: Changed expiry_date to expiryDate
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty Expiry
              </label>
              <input
                type="date"
                value={formData.warrantyExpiry} // FIX: Changed warranty_expiry to warrantyExpiry
                onChange={(e) => handleInputChange('warrantyExpiry', e.target.value)} // FIX: Changed warranty_expiry to warrantyExpiry
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Maintenance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Interval (Days)
            </label>
            <input
              type="number"
              min="0"
              value={formData.maintenanceIntervalDays} // FIX: Changed maintenance_interval_days to maintenanceIntervalDays
              onChange={(e) => handleInputChange('maintenanceIntervalDays', e.target.value)} // FIX: Changed maintenance_interval_days to maintenanceIntervalDays
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 90 for quarterly maintenance"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes or comments"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Update Item' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

InventoryItemModal.displayName = 'InventoryItemModal';

export default InventoryItemModal;
