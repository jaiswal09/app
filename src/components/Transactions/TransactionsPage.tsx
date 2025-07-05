import React, { useState, memo, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Calendar
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format, isAfter, parseISO } from 'date-fns';
import TransactionModal from './TransactionModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import type { Transaction } from '../../types';

const TransactionsPage = memo(() => {
  const { transactions, items, isTransactionsLoading, createTransaction } = useInventory();
  const { canManageInventory, profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter transactions based on user role
  const userTransactions = useMemo(() => {
    if (canManageInventory) {
      return transactions; // Admin/Staff see all transactions
    }
    // Regular users only see their own transactions
    return transactions.filter(t => t.user_id === profile?.user_id);
  }, [transactions, canManageInventory, profile?.user_id]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return userTransactions.filter(transaction => {
      const matchesSearch = transaction.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !selectedType || transaction.transaction_type === selectedType;
      const matchesStatus = !selectedStatus || transaction.status === selectedStatus;
      
      let matchesDate = true;
      if (dateRange) {
        const transactionDate = new Date(transaction.created_at);
        const today = new Date();
        switch (dateRange) {
          case 'today':
            matchesDate = transactionDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [userTransactions, searchTerm, selectedType, selectedStatus, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeCheckouts = userTransactions.filter(t => t.status === 'active' && t.transaction_type === 'checkout').length;
    const overdueItems = userTransactions.filter(t => t.status === 'overdue').length;
    const completedReturns = userTransactions.filter(t => t.status === 'completed').length;
    const totalTransactions = userTransactions.length;

    return {
      activeCheckouts,
      overdueItems,
      completedReturns,
      totalTransactions
    };
  }, [userTransactions]);

  const handleNewTransaction = () => {
    setIsModalOpen(true);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'User', 'Type', 'Quantity', 'Status', 'Due Date', 'Notes'];
    const csvData = filteredTransactions.map(transaction => [
      format(new Date(transaction.created_at), 'yyyy-MM-dd HH:mm'),
      transaction.item?.name || '',
      transaction.user?.full_name || '',
      transaction.transaction_type,
      transaction.quantity,
      transaction.status,
      transaction.due_date ? format(new Date(transaction.due_date), 'yyyy-MM-dd') : '',
      transaction.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const isOverdue = (transaction: Transaction) => {
    return transaction.due_date && 
           transaction.status === 'active' && 
           isAfter(new Date(), parseISO(transaction.due_date));
  };

  if (isTransactionsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Track item check-outs, check-ins, and returns</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleNewTransaction}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Checkouts</p>
              <p className="text-2xl font-bold text-blue-600">{stats.activeCheckouts}</p>
            </div>
            <ArrowRightLeft className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Items</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Returns</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedReturns}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
            </div>
            <ArrowRightLeft className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="checkout">Checkout</option>
            <option value="checkin">Check-in</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
            <option value="maintenance">Maintenance</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedType('');
              setSelectedStatus('');
              setDateRange('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item & User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className={`hover:bg-gray-50 ${isOverdue(transaction) ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.item?.name || 'Unknown Item'}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {transaction.user?.full_name || 'Unknown User'}
                      </div>
                      {transaction.location_used && (
                        <div className="text-xs text-gray-400">
                          Used at: {transaction.location_used}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.transaction_type)}`}>
                      {transaction.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      {isOverdue(transaction) && (
                        <AlertTriangle className="w-4 h-4 text-red-500" title="Overdue" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Created: {format(new Date(transaction.created_at), 'MMM dd, yyyy')}</div>
                      {transaction.due_date && (
                        <div className={isOverdue(transaction) ? 'text-red-600' : 'text-gray-500'}>
                          Due: {format(new Date(transaction.due_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                      {transaction.returned_date && (
                        <div className="text-green-600">
                          Returned: {format(new Date(transaction.returned_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(transaction)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <TransactionModal
          items={items}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}
    </div>
  );
});

TransactionsPage.displayName = 'TransactionsPage';

export default TransactionsPage;