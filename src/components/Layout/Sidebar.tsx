import React, { memo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Settings,
  Bug,
  X,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDebug } from '../../hooks/useDebug';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'medical_personnel'] },
  { id: 'inventory', label: 'Inventory', icon: Package, roles: ['admin', 'staff', 'medical_personnel'] },
  { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft, roles: ['admin', 'staff', 'medical_personnel'] },
  { id: 'billing', label: 'Billing', icon: Receipt, roles: ['admin', 'staff'] },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'staff'] },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, roles: ['admin', 'staff'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'staff'] },
  { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] }
];

const Sidebar = memo(({ activeSection, onSectionChange }: SidebarProps) => {
  const { profile } = useAuth();
  const { toggleDebugPanel, debugInfo } = useDebug();

  const filteredNavigation = navigation.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">MedInventory</h1>
              <p className="text-xs text-gray-500">Medical Inventory System</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            onClick={() => onSectionChange(activeSection)} // This will close the sidebar
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Connection Status</span>
          <div className="flex space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              debugInfo.connectionStatus.online ? 'bg-green-500' : 'bg-red-500'
            }`} title="Network" />
            <div className={`w-2 h-2 rounded-full ${
              debugInfo.connectionStatus.supabaseConnected ? 'bg-green-500' : 'bg-red-500'
            }`} title="Database" />
            <div className={`w-2 h-2 rounded-full ${
              debugInfo.connectionStatus.realtimeConnected ? 'bg-green-500' : 'bg-orange-500'
            }`} title="Real-time" />
          </div>
        </div>
        
        {/* Debug Button for Admin/Staff */}
        {(profile?.role === 'admin' || profile?.role === 'staff') && (
          <button
            onClick={toggleDebugPanel}
            className="w-full flex items-center space-x-2 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded transition-colors"
            title="Press Ctrl+Shift+D to toggle"
          >
            <Bug className="w-3 h-3 flex-shrink-0" />
            <span>Debug Panel</span>
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-gray-600">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize truncate">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;