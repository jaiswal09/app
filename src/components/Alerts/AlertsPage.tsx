import React, { useState, memo, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package,
  Search,
  Filter,
  Eye,
  Bell,
  BellOff
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import AlertDetailsModal from './AlertDetailsModal';
import type { LowStockAlert } from '../../types';

const AlertsPage = memo(() => {
  const { alerts, acknowledgeAlert, isAlertsLoading } = useInventory();
  const { canManageInventory, profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.item?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = !selectedLevel || alert.alert_level === selectedLevel;
      const matchesStatus = !selectedStatus || alert.status === selectedStatus;
      
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [alerts, searchTerm, selectedLevel, selectedStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active').length;
    const critical = alerts.filter(a => a.alert_level === 'critical' && a.status === 'active').length;
    const outOfStock = alerts.filter(a => a.alert_level === 'out_of_stock' && a.status === 'active').length;
    const acknowledged = alerts.filter(a => a.status === 'acknowledged').length;

    return { active, critical, outOfStock, acknowledged };
  }, [alerts]);

  const handleAcknowledgeAlert = (alert: LowStockAlert) => {
    if (profile) {
      acknowledgeAlert({ alertId: alert.id, userId: profile.user_id });
    }
  };

  const handleViewDetails = (alert: LowStockAlert) => {
    setSelectedAlert(alert);
    setIsDetailsModalOpen(true);
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'out_of_stock':
        return AlertTriangle;
      default:
        return Package;
    }
  };

  if (isAlertsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
          <p className="text-gray-600">Monitor and manage inventory alerts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
            </div>
            <Bell className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <Package className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
            </div>
            <BellOff className="w-8 h-8 text-yellow-600" />
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
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Levels</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedLevel('');
              setSelectedStatus('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlerts.map((alert) => {
                const AlertIcon = getAlertIcon(alert.alert_level);
                
                return (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <AlertIcon className={`w-5 h-5 ${
                          alert.alert_level === 'critical' || alert.alert_level === 'out_of_stock' 
                            ? 'text-red-500' 
                            : 'text-orange-500'
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {alert.item?.name || 'Unknown Item'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {alert.item?.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAlertLevelColor(alert.alert_level)}`}>
                        {alert.alert_level.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          Current: {alert.current_quantity}
                        </div>
                        <div className="text-gray-500">
                          Minimum: {alert.min_quantity}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(alert)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManageInventory && alert.status === 'active' && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert)}
                            className="text-green-600 hover:text-green-900"
                            title="Acknowledge Alert"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}
    </div>
  );
});

AlertsPage.displayName = 'AlertsPage';

export default AlertsPage;