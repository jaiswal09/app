import React, { useState, memo, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  FileText,
  PieChart
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

const ReportsPage = memo(() => {
  const { items, transactions, categories, alerts, stats } = useInventory();
  const { canManageInventory } = useAuth();
  
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedCategory, setSelectedCategory] = useState('');

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, parseInt(dateRange));

  // Filter data by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Overview Statistics - Fixed low stock count calculation
  const overviewStats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
    
    // Correct low stock calculation - items where current quantity <= minimum quantity
    const lowStockCount = items.filter(item => item.quantity <= item.min_quantity).length;
    
    const activeCheckouts = transactions.filter(t => t.status === 'active' && t.transaction_type === 'checkout').length;
    const overdueItems = transactions.filter(t => t.status === 'overdue').length;

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount, // Fixed calculation
      activeCheckouts,
      overdueItems,
      totalTransactions: filteredTransactions.length
    };
  }, [items, transactions, filteredTransactions]);

  // Transaction trends by day
  const transactionTrends = useMemo(() => {
    const days = [];
    for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.created_at);
        return tDate >= dayStart && tDate <= dayEnd;
      });

      days.push({
        date: format(date, 'MMM dd'),
        checkouts: dayTransactions.filter(t => t.transaction_type === 'checkout').length,
        checkins: dayTransactions.filter(t => t.transaction_type === 'checkin').length,
        total: dayTransactions.length
      });
    }
    
    return days;
  }, [filteredTransactions, dateRange]);

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const categoryMap = new Map();
    
    items.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      const existing = categoryMap.get(categoryName) || { 
        category: categoryName, 
        count: 0, 
        value: 0,
        transactions: 0
      };
      
      existing.count += 1;
      existing.value += (item.unit_price || 0) * item.quantity;
      
      // Count transactions for this category
      existing.transactions += filteredTransactions.filter(t => t.item?.category_id === item.category_id).length;
      
      categoryMap.set(categoryName, existing);
    });
    
    return Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);
  }, [items, filteredTransactions]);

  // Item usage analysis
  const itemUsageAnalysis = useMemo(() => {
    const itemMap = new Map();
    
    filteredTransactions.forEach(transaction => {
      if (transaction.item) {
        const existing = itemMap.get(transaction.item.id) || {
          name: transaction.item.name,
          category: transaction.item.category?.name || 'Uncategorized',
          checkouts: 0,
          checkins: 0,
          totalUsage: 0
        };
        
        if (transaction.transaction_type === 'checkout') {
          existing.checkouts += transaction.quantity;
        } else if (transaction.transaction_type === 'checkin') {
          existing.checkins += transaction.quantity;
        }
        
        existing.totalUsage = existing.checkouts;
        itemMap.set(transaction.item.id, existing);
      }
    });
    
    return Array.from(itemMap.values())
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, 10); // Top 10 most used items
  }, [filteredTransactions]);

  // Stock level analysis - Fixed for ring chart
  const stockLevelAnalysis = useMemo(() => {
    const analysis = {
      healthy: 0,
      low: 0,
      critical: 0,
      outOfStock: 0
    };

    items.forEach(item => {
      if (item.quantity === 0) {
        analysis.outOfStock++;
      } else if (item.quantity <= item.min_quantity * 0.5) {
        analysis.critical++;
      } else if (item.quantity <= item.min_quantity) {
        analysis.low++;
      } else {
        analysis.healthy++;
      }
    });

    return [
      { name: 'Healthy', value: analysis.healthy, color: '#10B981' },
      { name: 'Low Stock', value: analysis.low, color: '#F59E0B' },
      { name: 'Critical', value: analysis.critical, color: '#EF4444' },
      { name: 'Out of Stock', value: analysis.outOfStock, color: '#6B7280' }
    ].filter(item => item.value > 0); // Only show categories with values
  }, [items]);

  // Get actual low stock items from database - Fixed
  const lowStockItems = useMemo(() => {
    return items.filter(item => item.quantity <= item.min_quantity);
  }, [items]);

  // Export functions
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvData = data.map(row => 
      headers.map(header => {
        const value = row[header.toLowerCase().replace(' ', '_')] || row[header] || '';
        return `"${value}"`;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOverviewReport = () => {
    const data = [
      { metric: 'Total Items', value: overviewStats.totalItems },
      { metric: 'Total Value', value: `₹${overviewStats.totalValue.toLocaleString()}` },
      { metric: 'Low Stock Items', value: overviewStats.lowStockCount },
      { metric: 'Active Checkouts', value: overviewStats.activeCheckouts },
      { metric: 'Overdue Items', value: overviewStats.overdueItems },
      { metric: 'Total Transactions', value: overviewStats.totalTransactions }
    ];
    exportToCSV(data, 'overview-report', ['Metric', 'Value']);
  };

  const exportTransactionReport = () => {
    const data = filteredTransactions.map(t => ({
      date: format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      item: t.item?.name || '',
      user: t.user?.full_name || '',
      type: t.transaction_type,
      quantity: t.quantity,
      status: t.status,
      due_date: t.due_date ? format(new Date(t.due_date), 'yyyy-MM-dd') : '',
      notes: t.notes || ''
    }));
    exportToCSV(data, 'transaction-report', ['Date', 'Item', 'User', 'Type', 'Quantity', 'Status', 'Due Date', 'Notes']);
  };

  const exportInventoryReport = () => {
    const data = items.map(item => ({
      name: item.name,
      category: item.category?.name || '',
      type: item.item_type,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      location: item.location,
      status: item.status,
      unit_price: item.unit_price || 0,
      total_value: (item.unit_price || 0) * item.quantity
    }));
    exportToCSV(data, 'inventory-report', ['Name', 'Category', 'Type', 'Quantity', 'Min Quantity', 'Location', 'Status', 'Unit Price', 'Total Value']);
  };

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{overviewStats.totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">₹{overviewStats.totalValue.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{overviewStats.lowStockCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Checkouts</p>
              <p className="text-2xl font-bold text-blue-600">{overviewStats.activeCheckouts}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Items</p>
              <p className="text-2xl font-bold text-red-600">{overviewStats.overdueItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{overviewStats.totalTransactions}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Transaction Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={transactionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="checkouts" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
              <Area type="monotone" dataKey="checkins" stackId="1" stroke="#10B981" fill="#10B981" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Stock Level Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={stockLevelAnalysis}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false} // Removed labels to prevent overlapping
                outerRadius={80}
                innerRadius={40} // Added inner radius to make it a ring chart
                fill="#8884d8"
                dataKey="value"
              >
                {stockLevelAnalysis.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </RechartsPieChart>
          </ResponsiveContainer>
          
          {/* Custom Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stockLevelAnalysis.map((entry, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Transaction Activity Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={transactionTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="checkouts" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="checkins" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Most Used Items</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={itemUsageAnalysis} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="totalUsage" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderInventoryReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Category Value Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Low Stock Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Minimum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lowStockItems.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-gray-500 text-xs">{item.location}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {item.category?.name || 'Uncategorized'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.min_quantity}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.quantity === 0 ? 'bg-red-100 text-red-800' :
                      item.quantity <= item.min_quantity * 0.5 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.quantity === 0 ? 'Out of Stock' :
                       item.quantity <= item.min_quantity * 0.5 ? 'Critical' : 'Low Stock'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    ₹{((item.unit_price || 0) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {lowStockItems.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Low Stock Items</h3>
              <p className="text-gray-500">All items are adequately stocked.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!canManageInventory) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into inventory and transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button
            onClick={() => {
              if (selectedReport === 'overview') exportOverviewReport();
              else if (selectedReport === 'transactions') exportTransactionReport();
              else if (selectedReport === 'inventory') exportInventoryReport();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex space-x-1 p-1">
          <button
            onClick={() => setSelectedReport('overview')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedReport === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setSelectedReport('transactions')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedReport === 'transactions' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Transactions</span>
          </button>
          <button
            onClick={() => setSelectedReport('inventory')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedReport === 'inventory' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
          </button>
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && renderOverviewReport()}
      {selectedReport === 'transactions' && renderTransactionReport()}
      {selectedReport === 'inventory' && renderInventoryReport()}
    </div>
  );
});

ReportsPage.displayName = 'ReportsPage';

export default ReportsPage;