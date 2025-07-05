import React, { memo, useState } from 'react';
import { Bell, Search, LogOut, User, X, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInventory } from '../../hooks/useInventory';
import { useAINotifications } from '../../hooks/useAINotifications';
import { format } from 'date-fns';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const Header = memo(({ onMenuClick, sidebarOpen }: HeaderProps) => {
  const { profile, signOut } = useAuth();
  const { alerts } = useInventory();
  const { notifications } = useAINotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = activeAlerts.filter(alert => alert.alert_level === 'critical' || alert.alert_level === 'out_of_stock');
  
  // Combine AI notifications and alerts
  const allNotifications = [
    ...notifications.map(n => ({
      id: n.id,
      type: 'ai' as const,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      priority: n.priority
    })),
    ...activeAlerts.map(alert => ({
      id: alert.id,
      type: 'alert' as const,
      title: `${alert.alert_level.replace('_', ' ')} Stock Alert`,
      message: `${alert.item?.name} is ${alert.alert_level === 'out_of_stock' ? 'out of stock' : 'running low'}`,
      timestamp: alert.created_at,
      priority: alert.alert_level === 'critical' || alert.alert_level === 'out_of_stock' ? 'high' : 'medium'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-orange-500 bg-orange-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 relative">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Logo for mobile */}
        <div className="lg:hidden flex items-center">
          <h1 className="text-lg font-bold text-gray-900">MedInventory</h1>
        </div>

        {/* Search - Hidden on mobile, shown on larger screens */}
        <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory, transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Search button for mobile */}
          <button className="sm:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {allNotifications.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 text-xs rounded-full flex items-center justify-center text-white ${
                  criticalAlerts.length > 0 ? 'bg-red-500' : 'bg-orange-500'
                }`}>
                  {allNotifications.length > 9 ? '9+' : allNotifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {allNotifications.length > 0 ? (
                    allNotifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 last:border-b-0 border-l-4 ${getPriorityColor(notification.priority)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                notification.type === 'ai' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {notification.type === 'ai' ? 'AI Insight' : 'Stock Alert'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(notification.timestamp), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  )}
                </div>
                
                {allNotifications.length > 10 && (
                  <div className="p-3 border-t border-gray-200 text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                {profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;