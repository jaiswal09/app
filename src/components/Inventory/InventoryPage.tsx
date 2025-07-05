import React, { useState, memo, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  QrCode, 
  AlertTriangle,
  Eye,
  Download,
  Upload,
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import InventoryItemModal from './InventoryItemModal';
import InventoryDetailsModal from './InventoryDetailsModal';
import QRCodeModal from './QRCodeModal';
import EmailImportModal from './EmailImportModal';
import ExcelImportModal from './ExcelImportModal';
import SimpleImportModal from './SimpleImportModal';
import type { InventoryItem } from '../../types';

const InventoryPage = memo(() => {
  const { items, categories, isLoading, deleteItem, stats } = useInventory();
  const { canManageInventory } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrItem, setQRItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isEmailImportOpen, setIsEmailImportOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isSimpleImportOpen, setIsSimpleImportOpen] = useState(false);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
      const matchesStatus = !selectedStatus || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus]);

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteItem(item.id);
    }
  };

  const handleShowQR = (item: InventoryItem) => {
    setQRItem(item);
    setIsQRModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Type', 'Quantity', 'Min Quantity', 'Location', 'Status', 'Unit Price'];
    const csvData = filteredItems.map(item => [
      item.name,
      item.category?.name || '',
      item.item_type,
      item.quantity,
      item.min_quantity,
      item.location,
      item.status,
      item.unit_price || 0
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getStockLevelColor = (item: InventoryItem) => {
    if (item.quantity === 0) return 'text-red-600';
    if (item.quantity <= item.min_quantity) return 'text-orange-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage medical equipment, supplies, and medications</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          
          {canManageInventory && (
            <>
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Import</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={() => setIsSimpleImportOpen(true)}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Simple CSV Import</span>
                  </button>
                  <button
                    onClick={() => setIsEmailImportOpen(true)}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>From Email (AI)</span>
                  </button>
                  <button
                    onClick={() => setIsExcelImportOpen(true)}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel/CSV (AI)</span>
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleAddItem}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalValue.toLocaleString()}</p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
            </div>
            <Filter className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="in_use">In Use</option>
            <option value="maintenance">Maintenance</option>
            <option value="lost">Lost</option>
            <option value="expired">Expired</option>
            <option value="discontinued">Discontinued</option>
          </select>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Package className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                      {item.serial_number && (
                        <div className="text-xs text-gray-400">SN: {item.serial_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getStockLevelColor(item)}`}>
                      {item.quantity} / {item.min_quantity} min
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          item.quantity === 0 ? 'bg-red-500' :
                          item.quantity <= item.min_quantity ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (item.quantity / (item.max_quantity || item.min_quantity * 2)) * 100)}%`
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{((item.unit_price || 0) * item.quantity).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-green-600 hover:text-green-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShowQR(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Show QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      {canManageInventory && (
                        <>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Item"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <InventoryItemModal
          item={selectedItem}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && selectedItem && (
        <InventoryDetailsModal
          item={selectedItem}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}

      {isQRModalOpen && qrItem && (
        <QRCodeModal
          item={qrItem}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}

      {isEmailImportOpen && (
        <EmailImportModal
          onClose={() => setIsEmailImportOpen(false)}
        />
      )}

      {isExcelImportOpen && (
        <ExcelImportModal
          onClose={() => setIsExcelImportOpen(false)}
        />
      )}

      {isSimpleImportOpen && (
        <SimpleImportModal
          onClose={() => setIsSimpleImportOpen(false)}
        />
      )}
    </div>
  );
});

InventoryPage.displayName = 'InventoryPage';

export default InventoryPage;