import React, { useState, memo, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, Brain, CheckCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { mapExcelToInventory } from '../../lib/openai';
import { useInventory } from '../../hooks/useInventory';
import { toast } from 'react-hot-toast';

interface ExcelImportModalProps {
  onClose: () => void;
}

const ExcelImportModal = memo(({ onClose }: ExcelImportModalProps) => {
  const { createItem, updateItem, items, categories } = useInventory();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any>(null);
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

  const handleAIMapping = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload a file first');
      return;
    }

    setIsProcessing(true);
    try {
      const sampleRow = csvData[0];
      const result = await mapExcelToInventory(csvData, sampleRow);
      setMapping(result);
      
      if (result.confidence > 0.7) {
        toast.success('ChatGPT AI mapping completed successfully');
      } else {
        toast.warning('ChatGPT AI mapping completed with low confidence. Please review the mapping.');
      }
    } catch (error) {
      toast.error('Failed to generate ChatGPT AI mapping');
      console.error('AI mapping error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!mapping || selectedRows.length === 0) {
      toast.error('Please complete the mapping and select rows to import');
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;

      for (const rowIndex of selectedRows) {
        const row = csvData[parseInt(rowIndex)];
        
        try {
          // Map the row data using AI mapping
          const mappedItem = mapRowToInventoryItem(row, mapping);
          
          if (importMode === 'update') {
            // Try to find existing item by name or serial number
            const existingItem = items.find(item => 
              item.name.toLowerCase() === mappedItem.name.toLowerCase() ||
              (item.serial_number && mappedItem.serial_number && 
               item.serial_number === mappedItem.serial_number)
            );

            if (existingItem) {
              updateItem({ id: existingItem.id, updates: mappedItem });
              updateCount++;
            } else {
              createItem(mappedItem);
              successCount++;
            }
          } else {
            createItem(mappedItem);
            successCount++;
          }
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} items using ChatGPT AI`);
      }
      if (updateCount > 0) {
        toast.success(`Successfully updated ${updateCount} items using ChatGPT AI`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} rows`);
      }

      onClose();
    } catch (error) {
      toast.error('Failed to import data');
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const mapRowToInventoryItem = (row: any, mapping: any) => {
    const mappedItem: any = {};

    // Apply field mappings
    Object.entries(mapping.mapping || {}).forEach(([dbField, excelField]) => {
      if (excelField && row[excelField as string] !== undefined) {
        mappedItem[dbField] = row[excelField as string];
      }
    });

    // Apply transformations
    if (mapping.transformations) {
      // Category transformation
      if (mapping.transformations.category && mappedItem.category) {
        const categoryMapping = mapping.transformations.category.mapping || {};
        const normalizedCategory = mappedItem.category.toLowerCase();
        
        for (const [key, value] of Object.entries(categoryMapping)) {
          if (normalizedCategory.includes(key.toLowerCase())) {
            mappedItem.category = value;
            break;
          }
        }
      }

      // Item type transformation
      if (mapping.transformations.item_type) {
        const rules = mapping.transformations.item_type.rules || [];
        for (const rule of rules) {
          if (rule.if_category_contains && mappedItem.category) {
            if (mappedItem.category.toLowerCase().includes(rule.if_category_contains.toLowerCase())) {
              mappedItem.item_type = rule.then;
              break;
            }
          }
        }
      }
    }

    // Map category name to category ID
    if (mappedItem.category) {
      const category = categories.find(c => 
        c.name.toLowerCase().includes(mappedItem.category.toLowerCase())
      );
      mappedItem.category_id = category?.id || '';
      delete mappedItem.category;
    }

    // Set defaults for required fields
    return {
      name: mappedItem.name || 'Unknown Item',
      description: mappedItem.description || '',
      category_id: mappedItem.category_id || '',
      item_type: mappedItem.item_type || 'supplies',
      quantity: parseInt(mappedItem.quantity) || 0,
      min_quantity: parseInt(mappedItem.min_quantity) || Math.max(1, Math.floor((parseInt(mappedItem.quantity) || 0) * 0.2)),
      max_quantity: mappedItem.max_quantity ? parseInt(mappedItem.max_quantity) : null,
      unit_price: mappedItem.unit_price ? parseFloat(mappedItem.unit_price) : null,
      location: mappedItem.location || 'Storage Room',
      serial_number: mappedItem.serial_number || '',
      manufacturer: mappedItem.manufacturer || '',
      model: mappedItem.model || '',
      purchase_date: mappedItem.purchase_date || null,
      warranty_expiry: mappedItem.warranty_expiry || null,
      expiry_date: mappedItem.expiry_date || null,
      notes: mappedItem.notes || 'Imported from Excel/CSV using ChatGPT AI'
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Import from Excel/CSV</h2>
              <p className="text-sm text-gray-600">ChatGPT AI-powered data mapping and import</p>
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
                Upload Excel/CSV File
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
                  Click to upload or drag and drop your Excel/CSV file
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

          {/* Import Mode */}
          {csvData.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Mode
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="create"
                    checked={importMode === 'create'}
                    onChange={(e) => setImportMode(e.target.value as 'create' | 'update')}
                    className="mr-2"
                  />
                  <span className="text-sm">Create new items</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="update"
                    checked={importMode === 'update'}
                    onChange={(e) => setImportMode(e.target.value as 'create' | 'update')}
                    className="mr-2"
                  />
                  <span className="text-sm">Update existing items (match by name/serial)</span>
                </label>
              </div>
            </div>
          )}

          {/* AI Mapping */}
          {csvData.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h3 className="text-lg font-medium text-gray-900">ChatGPT AI Field Mapping</h3>
                <button
                  onClick={handleAIMapping}
                  disabled={isProcessing}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span>Generate ChatGPT Mapping</span>
                </button>
              </div>

              {mapping && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                    <h4 className="font-medium text-gray-900">Field Mapping (ChatGPT)</h4>
                    {mapping.confidence && (
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <span className={`text-sm font-medium ${
                          mapping.confidence > 0.8 ? 'text-green-600' : 
                          mapping.confidence > 0.6 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(mapping.mapping || {}).map(([dbField, excelField]) => (
                      <div key={dbField} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">{dbField}</span>
                        <span className="text-sm text-gray-600">→ {excelField as string}</span>
                      </div>
                    ))}
                  </div>

                  {mapping.suggestions && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">ChatGPT Suggestions</h4>
                          <p className="text-sm text-yellow-700">{mapping.suggestions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Data Preview */}
          {csvData.length > 0 && mapping && (
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
                        const mappedItem = mapRowToInventoryItem(row, mapping);
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
                              {mappedItem.unit_price ? `$${mappedItem.unit_price}` : '-'}
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
            {mapping && selectedRows.length > 0 && (
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
                <span>
                  {importMode === 'update' ? 'Update' : 'Import'} {selectedRows.length} Items
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ExcelImportModal.displayName = 'ExcelImportModal';

export default ExcelImportModal;