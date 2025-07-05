import React, { memo, useState } from 'react';
import { X, CheckCircle, XCircle, Edit, Save, Loader2 } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import type { Transaction } from '../../types';

interface TransactionDetailsModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const TransactionDetailsModal = memo(({ transaction, onClose }: TransactionDetailsModalProps) => {
  const { createTransaction, isCreatingTransaction } = useInventory();
  const { canManageInventory, profile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [returnData, setReturnData] = useState({
    quantity: transaction.quantity,
    condition_on_return: '',
    notes: ''
  });

  const handleReturn = async () => {
    if (!profile) return;

    const returnTransaction = {
      item_id: transaction.item_id,
      user_id: profile.user_id,
      transaction_type: 'checkin' as const,
      quantity: Number(returnData.quantity),
      condition_on_return: returnData.condition_on_return || null,
      notes: returnData.notes || null,
      status: 'completed' as const
    };

    createTransaction(returnTransaction);
    onClose();
  };

  const canReturn = transaction.status === 'active' && 
                   transaction.transaction_type === 'checkout' &&
                   (canManageInventory || transaction.user_id === profile?.user_id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'lost': return 'bg-gray-100 text-gray-800';
      case 'damaged': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'checkout': return 'bg-blue-100 text-blue-800';
      case 'checkin': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'damaged': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                  <p className="text-sm text-gray-900 font-mono">{transaction.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.transaction_type)}`}>
                      {transaction.transaction_type}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity</label>
                  <p className="text-sm text-gray-900">{transaction.quantity}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item & User</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Item</label>
                  <p className="text-sm text-gray-900">{transaction.item?.name || 'Unknown Item'}</p>
                  <p className="text-xs text-gray-500">{transaction.item?.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-sm text-gray-900">{transaction.user?.full_name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500">{transaction.user?.email}</p>
                </div>
                {transaction.location_used && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location Used</label>
                    <p className="text-sm text-gray-900">{transaction.location_used}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              {transaction.due_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(transaction.due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              {transaction.returned_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Returned</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(transaction.returned_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Return Condition */}
          {transaction.condition_on_return && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Return Condition</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {transaction.condition_on_return}
              </p>
            </div>
          )}

          {/* Return Section */}
          {canReturn && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Process Return</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>{isEditing ? 'Cancel' : 'Edit Return'}</span>
                </button>
              </div>

              {isEditing && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={transaction.quantity}
                      value={returnData.quantity}
                      onChange={(e) => setReturnData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition on Return
                    </label>
                    <select
                      value={returnData.condition_on_return}
                      onChange={(e) => setReturnData(prev => ({ ...prev, condition_on_return: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select condition</option>
                      <option value="good">Good Condition</option>
                      <option value="fair">Fair Condition</option>
                      <option value="damaged">Damaged</option>
                      <option value="needs_maintenance">Needs Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Notes
                    </label>
                    <textarea
                      value={returnData.notes}
                      onChange={(e) => setReturnData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any additional notes about the return"
                    />
                  </div>

                  <button
                    onClick={handleReturn}
                    disabled={isCreatingTransaction}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingTransaction ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Process Return</span>
                  </button>
                </div>
              )}
            </div>
          )}
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

TransactionDetailsModal.displayName = 'TransactionDetailsModal';

export default TransactionDetailsModal;