import React, { useState, memo } from 'react';
import { X, Mail, Upload, Brain, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { parseInventoryEmail } from '../../lib/openai';
import { useInventory } from '../../hooks/useInventory';
import { toast } from 'react-hot-toast';

interface EmailImportModalProps {
  onClose: () => void;
}

const EmailImportModal = memo(({ onClose }: EmailImportModalProps) => {
  const { createItem, categories } = useInventory();
  const [emailContent, setEmailContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleParseEmail = async () => {
    if (!emailContent.trim()) {
      toast.error('Please enter email content');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await parseInventoryEmail(emailContent);
      setParsedData(result);
      
      if (result.items && result.items.length > 0) {
        setSelectedItems(result.items.map((_: any, index: number) => index.toString()));
        toast.success(`Found ${result.items.length} items in email using ChatGPT`);
      } else {
        toast.warning('No inventory items found in email content');
      }
    } catch (error) {
      toast.error('Failed to parse email content with ChatGPT');
      console.error('Email parsing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportItems = async () => {
    if (!parsedData?.items || selectedItems.length === 0) {
      toast.error('No items selected for import');
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const indexStr of selectedItems) {
        const index = parseInt(indexStr);
        const item = parsedData.items[index];
        
        try {
          // Map category name to category ID
          const category = categories.find(c => 
            c.name.toLowerCase().includes(item.category?.toLowerCase() || '')
          );

          const inventoryItem = {
            name: item.name,
            description: item.description || '',
            category_id: category?.id || '',
            item_type: item.item_type || 'supplies',
            quantity: item.quantity || 0,
            min_quantity: item.min_quantity || Math.max(1, Math.floor((item.quantity || 0) * 0.2)),
            max_quantity: item.max_quantity || null,
            unit_price: item.unit_price || null,
            location: item.location || 'Storage Room',
            serial_number: item.serial_number || '',
            manufacturer: item.manufacturer || '',
            model: item.model || '',
            purchase_date: item.purchase_date || null,
            warranty_expiry: item.warranty_expiry || null,
            expiry_date: item.expiry_date || null,
            notes: item.notes || 'Imported from email using ChatGPT AI'
          };

          createItem(inventoryItem);
          successCount++;
        } catch (error) {
          console.error('Error importing item:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} items using ChatGPT AI`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} items`);
      }

      onClose();
    } catch (error) {
      toast.error('Failed to import items');
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleItemSelection = (index: string) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Import from Email</h2>
              <p className="text-sm text-gray-600">ChatGPT AI-powered email parsing for inventory updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste the email content containing inventory information here..."
            />
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <p className="text-xs text-gray-500">
                ChatGPT AI will automatically extract inventory items from the email content
              </p>
              <button
                onClick={handleParseEmail}
                disabled={isProcessing || !emailContent.trim()}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                <span>Parse with ChatGPT</span>
              </button>
            </div>
          </div>

          {/* Parsed Results */}
          {parsedData && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h3 className="text-lg font-medium text-gray-900">Parsed Items (ChatGPT)</h3>
                <div className="flex items-center space-x-2">
                  {parsedData.confidence && (
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <span className={`text-sm font-medium ${
                        parsedData.confidence > 0.8 ? 'text-green-600' : 
                        parsedData.confidence > 0.6 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {Math.round(parsedData.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {parsedData.error ? (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{parsedData.error}</span>
                </div>
              ) : parsedData.items && parsedData.items.length > 0 ? (
                <div className="space-y-3">
                  {parsedData.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItems.includes(index.toString())
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleItemSelection(index.toString())}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(index.toString())}
                              onChange={() => toggleItemSelection(index.toString())}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {item.category && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                            {item.quantity && (
                              <div>Qty: {item.quantity}</div>
                            )}
                            {item.unit_price && (
                              <div>Price: ${item.unit_price}</div>
                            )}
                            {item.manufacturer && (
                              <div>Mfg: {item.manufacturer}</div>
                            )}
                            {item.location && (
                              <div>Location: {item.location}</div>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No inventory items found in the email content</p>
                </div>
              )}

              {parsedData.suggestions && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">ChatGPT Suggestions</h4>
                      <p className="text-sm text-yellow-700">{parsedData.suggestions}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            {parsedData?.items && selectedItems.length > 0 && (
              <button
                onClick={handleImportItems}
                disabled={isProcessing}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Import {selectedItems.length} Items</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

EmailImportModal.displayName = 'EmailImportModal';

export default EmailImportModal;