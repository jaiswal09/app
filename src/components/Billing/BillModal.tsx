import React, { useState, memo } from 'react';
import { X, Save, Loader2, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { addDays, format } from 'date-fns';
import type { Bill, BillItem } from '../../types';

interface BillModalProps {
  bill: Bill | null;
  onClose: () => void;
}

const BillModal = memo(({ bill, onClose }: BillModalProps) => {
  const { createBill, updateBill, availableItems, isCreatingBill, isUpdatingBill, isLoadingAvailableItems } = useBilling();
  const isEditing = !!bill;
  const isLoading = isCreatingBill || isUpdatingBill;

  const [formData, setFormData] = useState({
    customer_name: bill?.customer_name || '',
    customer_email: bill?.customer_email || '',
    customer_phone: bill?.customer_phone || '',
    customer_address: bill?.customer_address || '',
    bill_date: bill?.bill_date || format(new Date(), 'yyyy-MM-dd'),
    due_date: bill?.due_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    tax_rate: bill?.tax_rate || 18,
    discount_amount: bill?.discount_amount || 0,
    notes: bill?.notes || '',
    status: bill?.status || 'draft' as const
  });

  const [billItems, setBillItems] = useState<BillItem[]>(bill?.items || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);

  // Filter available items based on search and stock availability
  const filteredItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    item.quantity > 0 &&
    item.unit_price > 0
  );

  const addItem = (inventoryItem: any) => {
    // Check if item is already in the bill
    const existingItemIndex = billItems.findIndex(item => item.item_id === inventoryItem.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const maxQuantity = inventoryItem.quantity;
      const currentQuantity = billItems[existingItemIndex].quantity;
      
      if (currentQuantity < maxQuantity) {
        updateItem(existingItemIndex, 'quantity', currentQuantity + 1);
      } else {
        alert(`Maximum available quantity for ${inventoryItem.name} is ${maxQuantity}`);
      }
    } else {
      // Add new item
      const newItem: BillItem = {
        id: Date.now().toString(),
        bill_id: bill?.id || '',
        item_id: inventoryItem.id,
        item_name: inventoryItem.name,
        item_description: inventoryItem.description || '',
        quantity: 1,
        unit_price: inventoryItem.unit_price || 0,
        total_price: inventoryItem.unit_price || 0
      };
      
      setBillItems(prev => [...prev, newItem]);
    }
    
    setSearchTerm('');
    setShowItemSearch(false);
  };

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    setBillItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Validate quantity against available stock
        if (field === 'quantity') {
          const inventoryItem = availableItems.find(inv => inv.id === item.item_id);
          const maxQuantity = inventoryItem?.quantity || 0;
          
          if (value > maxQuantity) {
            alert(`Maximum available quantity for ${item.item_name} is ${maxQuantity}`);
            return item; // Don't update if exceeds available stock
          }
        }
        
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = billItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = subtotal * (formData.tax_rate / 100);
  const totalAmount = subtotal + taxAmount - formData.discount_amount;

  // Check for stock availability issues
  const stockIssues = billItems.filter(item => {
    const inventoryItem = availableItems.find(inv => inv.id === item.item_id);
    return !inventoryItem || item.quantity > inventoryItem.quantity;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (billItems.length === 0) {
      alert('Please add at least one item to the bill');
      return;
    }

    if (stockIssues.length > 0) {
      alert('Please resolve stock availability issues before creating the bill');
      return;
    }

    const billData = {
      ...formData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      items: billItems
    };

    if (isEditing && bill) {
      updateBill({ id: bill.id, updates: billData });
    } else {
      createBill(billData);
    }
    
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Bill' : 'Create New Bill'}
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
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
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
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.customer_address}
                onChange={(e) => handleInputChange('customer_address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer address"
              />
            </div>
          </div>

          {/* Bill Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.bill_date}
                  onChange={(e) => handleInputChange('bill_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bill Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bill Items</h3>
              <button
                type="button"
                onClick={() => setShowItemSearch(!showItemSearch)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Stock Issues Warning */}
            {stockIssues.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h4 className="font-medium text-red-800">Stock Availability Issues</h4>
                </div>
                <ul className="mt-2 text-sm text-red-700">
                  {stockIssues.map((item, index) => {
                    const inventoryItem = availableItems.find(inv => inv.id === item.item_id);
                    const availableQty = inventoryItem?.quantity || 0;
                    return (
                      <li key={index}>
                        {item.item_name}: Requested {item.quantity}, Available {availableQty}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Item Search */}
            {showItemSearch && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {isLoadingAvailableItems ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Loading available items...</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="p-3 cursor-pointer hover:bg-white rounded border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.description}</div>
                            <div className="text-xs text-gray-400">{item.category_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">₹{item.unit_price}</div>
                            <div className="text-sm text-gray-500">Stock: {item.quantity}</div>
                            <div className="text-xs text-gray-400">{item.location}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {filteredItems.length === 0 && searchTerm && (
                      <div className="text-center py-4 text-gray-500">
                        No items found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billItems.map((item, index) => {
                    const inventoryItem = availableItems.find(inv => inv.id === item.item_id);
                    const availableQty = inventoryItem?.quantity || 0;
                    const hasStockIssue = item.quantity > availableQty;
                    
                    return (
                      <tr key={index} className={hasStockIssue ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{item.item_name}</div>
                            <div className="text-sm text-gray-500">{item.item_description}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${hasStockIssue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {availableQty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            max={availableQty}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className={`w-20 px-2 py-1 border rounded text-sm ${
                              hasStockIssue ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">₹{item.total_price.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {billItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Click "Add Item" to get started.
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({formData.tax_rate}%):</span>
                <span className="font-medium">₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
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
              placeholder="Additional notes or terms"
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
              disabled={isLoading || billItems.length === 0 || stockIssues.length > 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Update Bill' : 'Create Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

BillModal.displayName = 'BillModal';

export default BillModal;