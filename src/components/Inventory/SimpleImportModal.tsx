import React, { useState, memo, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useInventory } from '../../hooks/useInventory';
import { toast } from 'react-hot-toast';

interface SimpleImportModalProps {
  onClose: () => void;
}

const SimpleImportModal = memo(({ onClose }: SimpleImportModalProps) => {
  const { createItem, categories } = useInventory();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'create' | 'update'>('create');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setSelectedRows(results.data.map((_, index) => index.toString()));
        toast.success(`Loaded ${results.data.length} rows from file`);
      },
      error: (error) => {
        toast.error('Failed to parse file');
        console.error('CSV parsing error:', error);
      }
    });
  }, []);

  const handleImport = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select rows to import');
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const rowIndex of selectedRows) {
        const row = csvData[parseInt(rowIndex)];
        
        try {
          // Map the row data to inventory item format
          const mappedItem = mapRowToInventoryItem(row);
          createItem(mappedItem);
          successCount++;
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} items`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} rows`);
      }

      onClose();
    } catch (error) {
      toast.error('Failed to import data');
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const mapRowToInventoryItem = (row: any) => {
    // Map category name to category ID
    const categoryName = row.category || row.Category || '';
    const category = categories.find(c => 
      c.name.toLowerCase().includes(categoryName.toLowerCase())
    );

    // Set defaults for required fields
    return {
      name: row.name || row.Name || row.item_name || row['Item Name'] || 'Unknown Item',
      description: row.description || row.Description || row.desc || '',
      category_id: category?.id || '',
      item_type: (row.item_type || row['Item Type'] || row.type || 'supplies').toLowerCase(),
      quantity: parseInt(row.quantity || row.Quantity || row.qty || '0') || 0,
      min_quantity: parseInt(row.min_quantity || row['Min Quantity'] || row.minimum || '0') || Math.max(1, Math.floor((parseInt(row.quantity || '0') || 0) * 0.2)),
      max_quantity: row.max_quantity ? parseInt(row.max_quantity) : null,
      unit_price: row.unit_price || row['Unit Price'] || row.price ? parseFloat(row.unit_price || row['Unit Price'] || row.price) : null,
      location: row.location || row.Location || row.storage_location || 'Storage Room',
      serial_number: row.serial_number || row['Serial Number'] || row.serial || '',
      manufacturer: row.manufacturer || row.Manufacturer || row.brand || '',
      model: row.model || row.Model || '',
      purchase_date: row.purchase_date || row['Purchase Date'] || null,
      warranty_expiry: row.warranty_expiry || row['Warranty Expiry'] || null,
      expiry_date: row.expiry_date || row['Expiry Date'] || null,
      notes: row.notes || row.Notes || 'Imported from CSV file'
    };
  };

  const toggleRowSelection = (index: string) => {
    setSelectedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Digital Thermometer',
        description: 'Non-contact infrared thermometer',
        category: 'Medical Equipment',
        item_type: 'equipment',
        quantity: 10,
        min_quantity: 3,
        unit_price: 89.99,
        location: 'Storage Room A',
        manufacturer: 'Braun',
        model: 'ThermoScan 7',
        serial_number: 'BT-001',
        notes: 'Sample item'
      },
      {
        name: 'Surgical Gloves',
        description: 'Disposable nitrile gloves',
        category: 'Disposables',
        item_type: 'consumables',
        quantity: 500,
        min_quantity: 100,
        unit_price: 0.25,
        location: 'Supply Room',
        manufacturer: 'Ansell',
        model: 'TouchNTuff',
        serial_number: '',
        notes: 'Powder-free'
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Simple CSV Import</h2>
              <p className="text-sm text-gray-600">Import inventory data from CSV/Excel files</p>
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
          {/* File Upload */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
              <label className="block text-sm font-medium text-gray-700">
                Upload CSV/Excel File
              </label>
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto justify-center sm:justify-start"
              >
                <Download className="w-4 h-4" />
                <span>Download Template</span>
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop your CSV/Excel file
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports .csv, .xlsx, .xls files
                </p>
              </label>
            </div>

            {file && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Loaded: {file.name} ({csvData.length} rows)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Field Mapping Info */}
          {csvData.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Supported Column Names</h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>Required:</strong> name (or Name, item_name, Item Name)</p>
                <p><strong>Optional:</strong> description, category, item_type, quantity, min_quantity, unit_price, location, manufacturer, model, serial_number, notes</p>
                <p><strong>Note:</strong> Column names are case-insensitive and flexible (e.g., "Unit Price" = "unit_price")</p>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {csvData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Data Preview</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === csvData.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(csvData.map((_, index) => index.toString()));
                              } else {
                                setSelectedRows([]);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvData.map((row, index) => {
                        const mappedItem = mapRowToInventoryItem(row);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(index.toString())}
                                onChange={() => toggleRowSelection(index.toString())}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-900">{mappedItem.name}</td>
                            <td className="px-3 py-2 text-gray-600">{mappedItem.category_id ? 'Mapped' : 'Unknown'}</td>
                            <td className="px-3 py-2 text-gray-600">{mappedItem.quantity}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {mappedItem.unit_price ? `₹${mappedItem.unit_price}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
            {csvData.length > 0 && selectedRows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Import {selectedRows.length} Items</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

SimpleImportModal.displayName = 'SimpleImportModal';

export default SimpleImportModal;