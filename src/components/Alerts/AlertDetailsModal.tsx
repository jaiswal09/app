import React, { memo } from 'react';
import { X, Package, AlertTriangle, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import type { LowStockAlert } from '../../types';

interface AlertDetailsModalProps {
  alert: LowStockAlert;
  onClose: () => void;
}

const AlertDetailsModal = memo(({ alert, onClose }: AlertDetailsModalProps) => {
  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stockPercentage = alert.min_quantity > 0 
    ? Math.round((alert.current_quantity / alert.min_quantity) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Alert Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className={`w-6 h-6 ${
                alert.alert_level === 'critical' || alert.alert_level === 'out_of_stock' 
                  ? 'text-red-500' 
                  : 'text-orange-500'
              }`} />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {alert.alert_level === 'out_of_stock' ? 'Out of Stock Alert' :
                   alert.alert_level === 'critical' ? 'Critical Stock Alert' :
                   'Low Stock Alert'}
                </h3>
                <p className="text-sm text-gray-600">
                  Alert ID: {alert.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getAlertLevelColor(alert.alert_level)}`}>
                  {alert.alert_level.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alert.status)}`}>
                  {alert.status}
                </span>
              </div>
            </div>
          </div>

          {/* Item Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Item Information</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Item Name</label>
                  <p className="text-sm text-gray-900">{alert.item?.name || 'Unknown Item'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-sm text-gray-900">{alert.item?.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-sm text-gray-900">{alert.item?.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Item Type</label>
                  <p className="text-sm text-gray-900 capitalize">{alert.item?.item_type || 'N/A'}</p>
                </div>
              </div>
              
              {alert.item?.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900">{alert.item.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Information</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{alert.current_quantity}</div>
                  <div className="text-sm text-gray-500">Current Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{alert.min_quantity}</div>
                  <div className="text-sm text-gray-500">Minimum Required</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${stockPercentage < 50 ? 'text-red-600' : 'text-orange-600'}`}>
                    {stockPercentage}%
                  </div>
                  <div className="text-sm text-gray-500">of Minimum</div>
                </div>
              </div>
              
              {/* Stock Level Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    stockPercentage < 25 ? 'bg-red-500' :
                    stockPercentage < 50 ? 'bg-orange-500' :
                    stockPercentage < 75 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, stockPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>Minimum ({alert.min_quantity})</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Alert Created</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              
              {alert.acknowledged_at && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Acknowledged</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(alert.acknowledged_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
              
              {alert.resolved_at && (
                <div className="flex items-center space-x-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Resolved</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(alert.resolved_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                {alert.alert_level === 'out_of_stock' && (
                  <p className="text-blue-800">
                    <strong>Immediate Action Required:</strong> This item is completely out of stock. 
                    Place an urgent order to avoid service disruption.
                  </p>
                )}
                {alert.alert_level === 'critical' && (
                  <p className="text-blue-800">
                    <strong>Critical Stock Level:</strong> Stock is critically low. 
                    Consider placing an emergency order and review usage patterns.
                  </p>
                )}
                {alert.alert_level === 'low' && (
                  <p className="text-blue-800">
                    <strong>Reorder Recommended:</strong> Stock is below minimum threshold. 
                    Schedule a reorder to maintain adequate inventory levels.
                  </p>
                )}
                <p className="text-blue-700">
                  Consider increasing the minimum stock level if this item frequently runs low.
                </p>
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

AlertDetailsModal.displayName = 'AlertDetailsModal';

export default AlertDetailsModal;