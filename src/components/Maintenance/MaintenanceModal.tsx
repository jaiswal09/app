import React, { useState, memo } from 'react';
import { X, Save, Loader2, Search } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { addDays, format } from 'date-fns';
import type { InventoryItem, MaintenanceSchedule } from '../../types';

interface MaintenanceModalProps {
  maintenance: MaintenanceSchedule | null;
  items: InventoryItem[];
  onClose: () => void;
}

const MaintenanceModal = memo(({ maintenance, items, onClose }: MaintenanceModalProps) => {
  const { profile } = useAuth();
  const isEditing = !!maintenance;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(
    maintenance?.item || null
  );
  const [formData, setFormData] = useState({
    maintenance_type: maintenance?.maintenance_type || 'preventive' as const,
    scheduled_date: maintenance?.scheduled_date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    description: maintenance?.description || '',
    cost: maintenance?.cost || 0,
    notes: maintenance?.notes || '',
    technician_id: maintenance?.technician_id || '',
    status: maintenance?.status || 'scheduled' as const
  });

  // Filter items that need maintenance
  const availableItems = items.filter(item => 
    (item.item_type === 'equipment' || item.maintenance_interval_days) &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !profile) return;

    const maintenanceData = {
      item_id: selectedItem.id,
      maintenance_type: formData.maintenance_type,
      scheduled_date: formData.scheduled_date,
      description: formData.description,
      cost: formData.cost ? Number(formData.cost) : null,
      notes: formData.notes || null,
      technician_id: formData.technician_id || null,
      status: formData.status,
      created_by: profile.user_id
    };

    // Here you would call your maintenance creation/update function
    console.log('Maintenance data:', maintenanceData);
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Maintenance' : 'Schedule Maintenance'}
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
          {/* Equipment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Equipment *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    selectedItem?.id === item.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                      <div className="text-xs text-gray-400">
                        Location: {item.location} • Serial: {item.serial_number || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {item.manufacturer}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.model}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedItem && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">Selected: {selectedItem.name}</div>
                <div className="text-sm text-blue-700">
                  Location: {selectedItem.location} • Serial: {selectedItem.serial_number || 'N/A'}
                </div>
              </div>
            )}
          </div>

          {/* Maintenance Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maintenance Type *
              </label>
              <select
                required
                value={formData.maintenance_type}
                onChange={(e) => handleInputChange('maintenance_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="calibration">Calibration</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date *
              </label>
              <input
                type="date"
                required
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Cost ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the maintenance work to be performed"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes or special instructions"
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
              disabled={!selectedItem}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Update Maintenance' : 'Schedule Maintenance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

MaintenanceModal.displayName = 'MaintenanceModal';

export default MaintenanceModal;