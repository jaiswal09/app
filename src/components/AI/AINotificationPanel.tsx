import React, { memo } from 'react';
import { X, Brain, AlertTriangle, Info, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAINotifications } from '../../hooks/useAINotifications';
import { format } from 'date-fns';

const AINotificationPanel = memo(() => {
  const {
    notifications,
    isGenerating,
    lastGenerated,
    generateNotifications,
    dismissNotification,
    clearAllNotifications
  } = useAINotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  if (notifications.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <div className="fixed top-20 right-6 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Insights</h3>
          {isGenerating && (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={generateNotifications}
            disabled={isGenerating}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh AI insights"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearAllNotifications}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear all notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((notification) => {
          const IconComponent = getIcon(notification.type);
          
          return (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 last:border-b-0 ${getTypeColor(notification.type)} border-l-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {notification.title}
                      </h4>
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      {notification.message}
                    </p>
                    {notification.suggestedAction && (
                      <div className="text-xs bg-white bg-opacity-50 rounded p-2 mb-2">
                        <strong>Suggested Action:</strong> {notification.suggestedAction}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="capitalize">{notification.category}</span>
                      <span>{format(new Date(notification.timestamp), 'HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {lastGenerated && (
        <div className="p-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Last updated: {format(lastGenerated, 'MMM dd, HH:mm')}
          </p>
        </div>
      )}
    </div>
  );
});

AINotificationPanel.displayName = 'AINotificationPanel';

export default AINotificationPanel;