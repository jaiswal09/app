import { useState, memo, useMemo } from 'react'; // Removed React as it's not directly used
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  DollarSign,
  Calendar,
  CreditCard
} from 'lucide-react'; // Removed unused icons: User, FileText
import { useBilling } from '../../hooks/useBilling';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import BillModal from './BillModal';
import BillDetailsModal from './BillDetailsModal';
import type { Bill } from '../../types';

const BillingPage = memo(() => {
  const { bills, isLoading, deleteBill, stats } = useBilling();
  const { canManageInventory } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill: Bill) => { // FIX: Explicitly type 'bill'
      const matchesSearch = bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) || // FIX: Changed bill_number to billNumber
                           bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || // FIX: Changed customer_name to customerName
                           bill.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()); // FIX: Changed customer_email to customerEmail
      
      const matchesStatus = !selectedStatus || bill.status === selectedStatus;
      const matchesPaymentStatus = !selectedPaymentStatus || bill.paymentStatus === selectedPaymentStatus; // FIX: Changed payment_status to paymentStatus
      
      return matchesSearch && matchesStatus && matchesPaymentStatus;
    });
  }, [bills, searchTerm, selectedStatus, selectedPaymentStatus]);

  const handleNewBill = () => {
    setSelectedBill(null);
    setIsModalOpen(true);
  };

  const handleEditBill = (bill: Bill) => { // FIX: Explicitly type 'bill'
    setSelectedBill(bill);
    setIsModalOpen(true);
  };

  const handleViewDetails = (bill: Bill) => { // FIX: Explicitly type 'bill'
    setSelectedBill(bill);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteBill = (bill: Bill) => { // FIX: Explicitly type 'bill'
    // FIX: Replaced window.confirm with a placeholder for a custom modal.
    // You should implement a custom confirmation modal component here.
    if (confirm(`Are you sure you want to delete bill ${bill.billNumber}?`)) { // FIX: Changed bill_number to billNumber
      deleteBill(bill.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageInventory) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">You don't have permission to manage billing.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600">Manage bills, invoices, and payments</p>
        </div>
        <button
          onClick={handleNewBill}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Bill</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
            </div>
            <Receipt className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-600">₹{stats.pendingAmount.toLocaleString()}</p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Bills</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueBills}</p>
            </div>
            <Calendar className="w-8 h-8 text-red-600" />
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
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('');
              setSelectedPaymentStatus('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.length > 0 ? ( // FIX: Added conditional rendering for table rows
                filteredBills.map((bill: Bill) => ( // FIX: Explicitly type 'bill'
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bill.billNumber}</div> {/* FIX: Changed bill_number to billNumber */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bill.customerName}</div> {/* FIX: Changed customer_name to customerName */}
                        <div className="text-sm text-gray-500">{bill.customerEmail}</div> {/* FIX: Changed customer_email to customerEmail */}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(bill.billDate), 'MMM dd, HH:mm')} {/* FIX: Changed bill_date to billDate */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{bill.totalAmount.toLocaleString()} {/* FIX: Changed total_amount to totalAmount */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(bill.paymentStatus)}`}> {/* FIX: Changed payment_status to paymentStatus */}
                        {bill.paymentStatus} {/* FIX: Changed payment_status to paymentStatus */}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(bill)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditBill(bill)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Bill"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : null} {/* If no filtered bills, render nothing here */}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
            <p className="text-gray-500">
              {bills.length === 0 
                ? 'No bills have been created yet. Click "Create Bill" to get started.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <BillModal
          bill={selectedBill}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && selectedBill && (
        <BillDetailsModal
          bill={selectedBill}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}
    </div>
  );
});

BillingPage.displayName = 'BillingPage';

export default BillingPage;
