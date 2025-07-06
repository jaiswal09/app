import { memo } from 'react';
import { X, Package, MapPin, Calendar, DollarSign, AlertTriangle, Wrench, QrCode } from 'lucide-react';
import { format, isValid } from 'date-fns';
import type { InventoryItem } from '../../types';

interface InventoryDetailsModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const InventoryDetailsModal = memo(({ item, onClose }: InventoryDetailsModalProps) => {
  // Helper to safely create a Date object
  const createSafeDate = (dateString: string | Date | null | undefined): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isValid(date) ? date : null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'discontinued': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'equipment': return 'bg-blue-100 text-blue-800';
      case 'supplies': return 'bg-green-100 text-green-800';
      case 'medications': return 'bg-purple-100 text-purple-800';
      case 'consumables': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // FIX: Changed max_quantity to maxQuantity, min_quantity to minQuantity
  const stockPercentage = item.maxQuantity 
    ? Math.round((item.quantity / item.maxQuantity) * 100)
    : Math.round((item.quantity / ((item.minQuantity || 1) * 2)) * 100); // Ensure minQuantity is not zero for division

  const isLowStock = item.quantity <= item.minQuantity; // FIX: Changed min_quantity to minQuantity
  const isCriticalStock = item.quantity <= (item.minQuantity || 0) * 0.5; // FIX: Changed min_quantity to minQuantity

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Item Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(item.itemType)}`}>
                    {item.itemType}
                  </span>
                  {item.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {item.category.name}
                    </span>
                  )}
                </div>
              </div>
              {/* FIX: Changed qr_code to qrCode and moved comment outside conditional */}
              {item.qrCode && (
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-mono">{item.qrCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Information</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    isCriticalStock ? 'text-red-600' : 
                    isLowStock ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {item.quantity}
                  </div>
                  <div className="text-sm text-gray-500">Current Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{item.minQuantity}</div>
                  <div className="text-sm text-gray-500">Minimum Required</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {item.maxQuantity || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Maximum Capacity</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    stockPercentage < 25 ? 'text-red-600' :
                    stockPercentage < 50 ? 'text-orange-600' :
                    stockPercentage < 75 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {stockPercentage}%
                  </div>
                  <div className="text-sm text-gray-500">Stock Level</div>
                </div>
              </div>
              
              {/* Stock Level Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className={`h-4 rounded-full ${
                    stockPercentage < 25 ? 'bg-red-500' :
                    stockPercentage < 50 ? 'bg-orange-500' :
                    stockPercentage < 75 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, stockPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>Minimum ({item.minQuantity})</span>
                {item.maxQuantity && <span>Maximum ({item.maxQuantity})</span>}
              </div>

              {/* Stock Alerts */}
              {isLowStock && (
                <div className={`mt-4 p-3 rounded-lg ${
                  isCriticalStock ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      isCriticalStock ? 'text-red-500' : 'text-orange-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isCriticalStock ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      {isCriticalStock ? 'Critical Stock Level' : 'Low Stock Alert'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    isCriticalStock ? 'text-red-700' : 'text-orange-700'
                  }`}>
                    {isCriticalStock 
                      ? 'Immediate reorder required to prevent stockout.'
                      : 'Consider reordering to maintain adequate stock levels.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Location</div>
                    <div className="text-sm text-gray-600">{item.location}</div>
                  </div>
                </div>
                
                {item.serialNumber && (
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Serial Number</div>
                      <div className="text-sm text-gray-600 font-mono">{item.serialNumber}</div>
                    </div>
                  </div>
                )}
                
                {item.manufacturer && (
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Manufacturer</div>
                      <div className="text-sm text-gray-600">{item.manufacturer}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {item.model && (
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Model</div>
                      <div className="text-sm text-gray-600">{item.model}</div>
                    </div>
                  </div>
                )}
                
                {item.unitPrice && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Unit Price</div>
                      <div className="text-sm text-gray-600">₹{item.unitPrice.toLocaleString()}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Total Value</div>
                    <div className="text-sm text-gray-600">
                      ₹{((item.unitPrice || 0) * item.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {item.purchaseDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Purchase Date</div>
                    <div className="text-sm text-gray-600">
                      {format(createSafeDate(item.purchaseDate) || new Date(), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              )}
              
              {item.warrantyExpiry && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Warranty Expiry</div>
                    <div className="text-sm text-gray-600">
                      {format(createSafeDate(item.warrantyExpiry) || new Date(), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              )}
              
              {item.expiryDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Expiry Date</div>
                    <div className="text-sm text-gray-600">
                      {format(createSafeDate(item.expiryDate) || new Date(), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Information */}
          {(item.maintenanceIntervalDays || item.lastMaintenance || item.nextMaintenance) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Information</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {item.maintenanceIntervalDays && (
                    <div className="flex items-center space-x-3">
                      <Wrench className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Maintenance Interval</div>
                        <div className="text-sm text-gray-600">{item.maintenanceIntervalDays} days</div>
                      </div>
                    </div>
                  )}
                  
                  {item.lastMaintenance && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Last Maintenance</div>
                        <div className="text-sm text-gray-600">
                          {format(createSafeDate(item.lastMaintenance) || new Date(), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {item.nextMaintenance && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Next Maintenance</div>
                        <div className="text-sm text-gray-600">
                          {format(createSafeDate(item.nextMaintenance) || new Date(), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{item.notes}</p>
              </div>
            </div>
          )}

          {/* Record Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{format(createSafeDate(item.createdAt) || new Date(), 'MMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p>{format(createSafeDate(item.updatedAt) || new Date(), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

InventoryDetailsModal.displayName = 'InventoryDetailsModal';

export default InventoryDetailsModal;
