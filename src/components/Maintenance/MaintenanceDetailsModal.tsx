import React, { memo } from 'react';
import { X, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { MaintenanceSchedule } from '../../types';

interface MaintenanceDetailsModalProps {
  maintenance: MaintenanceSchedule;
  onClose: () => void;
}

const MaintenanceDetailsModal = memo(({ maintenance, onClose }: MaintenanceDetailsModalProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventive': return 'bg-green-100 text-green-800';
      case 'corrective': return 'bg-red-100 text-red-800';
      case 'calibration': return 'bg-blue-100 text-blue-800';
      case 'inspection': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Maintenance Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Equipment Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Equipment Name</label>
                  <p className="text-sm text-gray-900">{maintenance.item?.name || 'Unknown Equipment'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-sm text-gray-900">{maintenance.item?.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serial Number</label>
                  <p className="text-sm text-gray-900">{maintenance.item?.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                  <p className="text-sm text-gray-900">{maintenance.item?.manufacturer || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Maintenance ID</label>
                <p className="text-sm text-gray-900 font-mono">{maintenance.id.slice(0, 8)}...</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(maintenance.maintenance_type)}`}>
                    {maintenance.maintenance_type}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(maintenance.status)}`}>
                    {maintenance.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Cost</label>
                <p className="text-sm text-gray-900">
                  {maintenance.cost ? `$${maintenance.cost.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Scheduled Date</label>
                <p className="text-sm text-gray-900">
                  {format(new Date(maintenance.scheduled_date), 'MMM dd, yyyy')}
                </p>
              </div>
              {maintenance.completed_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Completed Date</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(maintenance.completed_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              {maintenance.next_maintenance_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Next Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(maintenance.next_maintenance_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Technician */}
          {maintenance.technician && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Technician</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{maintenance.technician.full_name}</p>
                    <p className="text-sm text-gray-500">{maintenance.technician.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {maintenance.description || 'No description provided'}
            </p>
          </div>

          {/* Notes */}
          {maintenance.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {maintenance.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{format(new Date(maintenance.created_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p>{format(new Date(maintenance.updated_at), 'MMM dd, yyyy HH:mm')}</p>
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

MaintenanceDetailsModal.displayName = 'MaintenanceDetailsModal';

export default MaintenanceDetailsModal;