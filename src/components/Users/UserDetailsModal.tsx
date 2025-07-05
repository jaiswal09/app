import React, { memo } from 'react';
import { X, User, Mail, Phone, Shield, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { UserProfile } from '../../types';

interface UserDetailsModalProps {
  user: UserProfile;
  onClose: () => void;
}

const UserDetailsModal = memo(({ user, onClose }: UserDetailsModalProps) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'medical_personnel': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access including user management, system settings, and all inventory operations.';
      case 'staff':
        return 'Inventory management, transaction processing, maintenance scheduling, and reporting access.';
      case 'medical_personnel':
        return 'Basic inventory access for checking out/in items and viewing their own transaction history.';
      default:
        return 'Standard user access.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-gray-600">
                  {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{user.full_name}</h3>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Email</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>
              </div>
              
              {user.phone_number && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Phone</div>
                    <div className="text-sm text-gray-600">{user.phone_number}</div>
                  </div>
                </div>
              )}
              
              {user.department && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Department</div>
                    <div className="text-sm text-gray-600">{user.department}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Role & Permissions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Permissions</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.role.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getRoleDescription(user.role)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {user.role === 'admin' && (
                    <>
                      <div>✓ Full system administration</div>
                      <div>✓ User management</div>
                      <div>✓ System settings</div>
                      <div>✓ All inventory operations</div>
                      <div>✓ Advanced reporting</div>
                    </>
                  )}
                  {user.role === 'staff' && (
                    <>
                      <div>✓ Inventory management</div>
                      <div>✓ Transaction processing</div>
                      <div>✓ Maintenance scheduling</div>
                      <div>✓ Reporting access</div>
                      <div>✗ User management</div>
                    </>
                  )}
                  {user.role === 'medical_personnel' && (
                    <>
                      <div>✓ Item checkout/checkin</div>
                      <div>✓ View own transactions</div>
                      <div>✓ Basic inventory viewing</div>
                      <div>✗ Inventory management</div>
                      <div>✗ User management</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Created</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(user.created_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Last Updated</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(user.updated_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">User ID</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {user.user_id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-700">Total Transactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-700">Active Checkouts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-700">Overdue Items</div>
                </div>
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

UserDetailsModal.displayName = 'UserDetailsModal';

export default UserDetailsModal;