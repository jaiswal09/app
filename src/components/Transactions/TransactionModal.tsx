import React, { useState, memo } from 'react';
import { X, Save, Loader2, Search } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { addDays, format } from 'date-fns';
import type { InventoryItem } from '../../types';

interface TransactionModalProps {
  items: InventoryItem[];
  onClose: () => void;
}

const TransactionModal = memo(({ items, onClose }: TransactionModalProps) => {
  const { createTransaction, isCreatingTransaction } = useTransactions();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    transaction_type: 'checkout' as const,
    quantity: 1,
    due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), // Default to 7 days from now
    location_used: '',
    notes: ''
  });

  // Filter available items
  const availableItems = items.filter(item => 
    item.status === 'available' && 
    item.quantity > 0 &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !profile) return;

    const transactionData = {
      item_id: selectedItem.id,
      user_id: profile.user_id,
      transaction_type: formData.transaction_type,
      quantity: Number(formData.quantity),
      due_date: formData.transaction_type === 'checkout' ? formData.due_date : null,
      location_used: formData.location_used || null,
      notes: formData.notes || null,
      status: 'active' as const
    };

    createTransaction(transactionData);
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const maxQuantity = selectedItem ? selectedItem.quantity : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type *
            </label>
            <select
              required
              value={formData.transaction_type}
              onChange={(e) => handleInputChange('transaction_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="checkout">Check Out</option>
              <option value="checkin">Check In</option>
              <option value="lost">Report Lost</option>
              <option value="damaged">Report Damaged</option>
              <option value="maintenance">Send to Maintenance</option>
            </select>
          </div>

          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Item *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
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
                        Location: {item.location} • Available: {item.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${item.unit_price || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.category?.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availableItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No available items found
              </div>
            )}

            {selectedItem && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">Selected: {selectedItem.name}</div>
                <div className="text-sm text-blue-700">
                  Available quantity: {selectedItem.quantity} • Location: {selectedItem.location}
                </div>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              required
              min="1"
              max={maxQuantity}
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedItem}
            />
            {selectedItem && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum available: {maxQuantity}
              </p>
            )}
          </div>

          {/* Due Date (only for checkout) */}
          {formData.transaction_type === 'checkout' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Location Used */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location to be Used
            </label>
            <input
              type="text"
              value={formData.location_used}
              onChange={(e) => handleInputChange('location_used', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Operating Room 1, Patient Room 205"
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
              disabled={isCreatingTransaction || !selectedItem}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingTransaction ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Create Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

TransactionModal.displayName = 'TransactionModal';

export default TransactionModal;