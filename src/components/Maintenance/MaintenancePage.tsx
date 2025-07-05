import React, { useState, memo, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  DollarSign,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import MaintenanceModal from './MaintenanceModal';
import MaintenanceDetailsModal from './MaintenanceDetailsModal';
import type { MaintenanceSchedule } from '../../types';

const MaintenancePage = memo(() => {
  const { maintenance, items, isMaintenanceLoading } = useInventory();
  const { canManageInventory } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceSchedule | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter maintenance records
  const filteredMaintenance = useMemo(() => {
    return maintenance.filter(record => {
      const matchesSearch = record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.item?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !selectedStatus || record.status === selectedStatus;
      const matchesType = !selectedType || record.maintenance_type === selectedType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [maintenance, searchTerm, selectedStatus, selectedType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    const scheduled = maintenance.filter(m => m.status === 'scheduled').length;
    const inProgress = maintenance.filter(m => m.status === 'in_progress').length;
    const overdue = maintenance.filter(m => 
      m.status === 'scheduled' && isBefore(new Date(m.scheduled_date), today)
    ).length;
    const upcoming = maintenance.filter(m => 
      m.status === 'scheduled' && 
      isAfter(new Date(m.scheduled_date), today) &&
      isBefore(new Date(m.scheduled_date), nextWeek)
    ).length;

    return { scheduled, inProgress, overdue, upcoming };
  }, [maintenance]);

  const handleNewMaintenance = () => {
    setSelectedMaintenance(null);
    setIsModalOpen(true);
  };

  const handleEditMaintenance = (record: MaintenanceSchedule) => {
    setSelectedMaintenance(record);
    setIsModalOpen(true);
  };

  const handleViewDetails = (record: MaintenanceSchedule) => {
    setSelectedMaintenance(record);
    setIsDetailsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventive': return 'bg-green-100 text-green-800';
      case 'corrective': return 'bg-red-100 text-red-800';
      case 'calibration': return 'bg-blue-100 text-blue-800';
      case 'inspection': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (record: MaintenanceSchedule) => {
    return record.status === 'scheduled' && isBefore(new Date(record.scheduled_date), new Date());
  };

  if (isMaintenanceLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-600">Schedule and track equipment maintenance</p>
        </div>
        {canManageInventory && (
          <button
            onClick={handleNewMaintenance}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Maintenance</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming (7 days)</p>
              <p className="text-2xl font-bold text-green-600">{stats.upcoming}</p>
            </div>
            <Wrench className="w-8 h-8 text-green-600" />
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
              placeholder="Search maintenance..."
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
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="preventive">Preventive</option>
            <option value="corrective">Corrective</option>
            <option value="calibration">Calibration</option>
            <option value="inspection">Inspection</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('');
              setSelectedType('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaintenance.map((record) => (
                <tr key={record.id} className={`hover:bg-gray-50 ${isOverdue(record) ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.item?.name || 'Unknown Item'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(record.maintenance_type)}`}>
                      {record.maintenance_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {format(new Date(record.scheduled_date), 'MMM dd, yyyy')}
                      {isOverdue(record) && (
                        <div className="text-red-600 text-xs">Overdue</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.technician?.full_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.cost ? `$${record.cost.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManageInventory && (
                        <>
                          <button
                            onClick={() => handleEditMaintenance(record)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Maintenance"
                          >
                            <Edit className="w-4 h-4" />
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

        {filteredMaintenance.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance records found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <MaintenanceModal
          maintenance={selectedMaintenance}
          items={items}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && selectedMaintenance && (
        <MaintenanceDetailsModal
          maintenance={selectedMaintenance}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}
    </div>
  );
});

MaintenancePage.displayName = 'MaintenancePage';

export default MaintenancePage;