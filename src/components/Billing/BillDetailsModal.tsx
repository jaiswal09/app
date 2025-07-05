import React, { memo } from 'react';
import { X, Download, Printer, Receipt, Calendar, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { generateBillPDF } from '../../lib/pdfGenerator';
import type { Bill } from '../../types';

interface BillDetailsModalProps {
  bill: Bill;
  onClose: () => void;
}

const BillDetailsModal = memo(({ bill, onClose }: BillDetailsModalProps) => {
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

  const handleDownloadPDF = () => {
    generateBillPDF(bill);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill ${bill.bill_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .bill-info { margin-bottom: 20px; }
              .customer-info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .totals { text-align: right; }
              .total-row { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>MedInventory</h1>
              <h2>Invoice</h2>
            </div>
            
            <div class="bill-info">
              <p><strong>Bill Number:</strong> ${bill.bill_number}</p>
              <p><strong>Date:</strong> ${format(new Date(bill.bill_date), 'MMM dd, yyyy')}</p>
              ${bill.due_date ? `<p><strong>Due Date:</strong> ${format(new Date(bill.due_date), 'MMM dd, yyyy')}</p>` : ''}
            </div>
            
            <div class="customer-info">
              <h3>Bill To:</h3>
              <p><strong>${bill.customer_name}</strong></p>
              ${bill.customer_email ? `<p>${bill.customer_email}</p>` : ''}
              ${bill.customer_phone ? `<p>${bill.customer_phone}</p>` : ''}
              ${bill.customer_address ? `<p>${bill.customer_address}</p>` : ''}
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${bill.items?.map(item => `
                  <tr>
                    <td>
                      <strong>${item.item_name}</strong>
                      ${item.item_description ? `<br><small>${item.item_description}</small>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toLocaleString()}</td>
                    <td>₹${item.total_price.toLocaleString()}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            
            <div class="totals">
              <p>Subtotal: ₹${bill.subtotal.toLocaleString()}</p>
              <p>Tax (${bill.tax_rate}%): ₹${bill.tax_amount.toLocaleString()}</p>
              ${bill.discount_amount > 0 ? `<p>Discount: -₹${bill.discount_amount.toLocaleString()}</p>` : ''}
              <p class="total-row">Total: ₹${bill.total_amount.toLocaleString()}</p>
            </div>
            
            ${bill.notes ? `<div><h3>Notes:</h3><p>${bill.notes}</p></div>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Receipt className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Bill Details</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bill Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Bill Number:</span>
                    <span className="ml-2 font-medium text-gray-900">{bill.bill_number}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="ml-2 text-gray-900">{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</span>
                  </div>
                  {bill.due_date && (
                    <div>
                      <span className="text-sm text-gray-500">Due Date:</span>
                      <span className="ml-2 text-gray-900">{format(new Date(bill.due_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Payment:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(bill.payment_status)}`}>
                      {bill.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <span className="ml-2 font-medium text-gray-900">{bill.customer_name}</span>
                  </div>
                  {bill.customer_email && (
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <span className="ml-2 text-gray-900">{bill.customer_email}</span>
                    </div>
                  )}
                  {bill.customer_phone && (
                    <div>
                      <span className="text-sm text-gray-500">Phone:</span>
                      <span className="ml-2 text-gray-900">{bill.customer_phone}</span>
                    </div>
                  )}
                  {bill.customer_address && (
                    <div>
                      <span className="text-sm text-gray-500">Address:</span>
                      <span className="ml-2 text-gray-900">{bill.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bill.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                          {item.item_description && (
                            <div className="text-sm text-gray-500">{item.item_description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">₹{item.unit_price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{item.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{bill.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({bill.tax_rate}%):</span>
                <span className="font-medium">₹{bill.tax_amount.toLocaleString()}</span>
              </div>
              {bill.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-₹{bill.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{bill.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{bill.notes}</p>
              </div>
            </div>
          )}

          {/* Payment History */}
          {bill.payments && bill.payments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bill.payments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          ₹{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {payment.reference_number || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Record Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{format(new Date(bill.created_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p>{format(new Date(bill.updated_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>
          </div>
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

BillDetailsModal.displayName = 'BillDetailsModal';

export default BillDetailsModal;