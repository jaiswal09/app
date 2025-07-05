import React, { memo } from 'react';
import { X, Wifi, Database, Radio, Download, Trash2, RefreshCw } from 'lucide-react';
import { useDebug } from '../../hooks/useDebug';
import { formatDistanceToNow } from 'date-fns';

const DebugPanel = memo(() => {
  const { debugInfo, isVisible, toggleDebugPanel, performPingTest, clearLogs, exportDebugData } = useDebug();

  if (!isVisible) return null;

  const { connectionStatus, apiRequests, realtimeEvents, environment } = debugInfo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Debug Panel</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={performPingTest}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Ping Test</span>
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Logs</span>
            </button>
            <button
              onClick={exportDebugData}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
            <button
              onClick={toggleDebugPanel}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Connection & Environment */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            {/* Connection Status */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Connection Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">Network</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus.online ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span className="text-sm">Database</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus.supabaseConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4" />
                    <span className="text-sm">Real-time</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus.realtimeConnected ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                </div>
                
                {connectionStatus.latency && (
                  <div className="text-xs text-gray-500 mt-2">
                    Latency: {connectionStatus.latency}ms
                  </div>
                )}
              </div>
            </div>

            {/* Environment Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Environment</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Project ID:</span> {environment.projectId}
                </div>
                <div>
                  <span className="font-medium">User ID:</span> {environment.userId?.slice(0, 8)}...
                </div>
                <div>
                  <span className="font-medium">Role:</span> {environment.userRole}
                </div>
                <div>
                  <span className="font-medium">Environment:</span> {import.meta.env.MODE}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Panel - API Requests */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-3">API Requests ({apiRequests.length})</h3>
            <div className="space-y-2">
              {apiRequests.map((request) => (
                <div key={request.id} className="p-3 bg-gray-50 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 rounded text-white font-medium ${
                        request.method === 'GET' ? 'bg-blue-500' :
                        request.method === 'POST' ? 'bg-green-500' :
                        request.method === 'PUT' ? 'bg-orange-500' :
                        request.method === 'DELETE' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}>
                        {request.method}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-white font-medium ${
                        request.status >= 200 && request.status < 300 ? 'bg-green-500' :
                        request.status >= 400 ? 'bg-red-500' :
                        'bg-orange-500'
                      }`}>
                        {request.status || 'ERR'}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {request.duration}ms • {formatDistanceToNow(new Date(request.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-gray-700 break-all">
                    {request.url.replace(environment.supabaseUrl || '', '').substring(0, 100)}...
                  </div>
                  {request.error && (
                    <div className="mt-1 text-red-600 font-medium">
                      Error: {request.error}
                    </div>
                  )}
                </div>
              ))}
              
              {apiRequests.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No API requests logged yet
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Real-time Events */}
          <div className="w-1/3 border-l border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Real-time Events ({realtimeEvents.length})</h3>
            <div className="space-y-2">
              {realtimeEvents.map((event) => (
                <div key={event.id} className="p-3 bg-gray-50 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-white font-medium ${
                      event.type === 'connection' ? 'bg-blue-500' :
                      event.eventType === 'INSERT' ? 'bg-green-500' :
                      event.eventType === 'UPDATE' ? 'bg-orange-500' :
                      event.eventType === 'DELETE' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}>
                      {event.eventType || event.type}
                    </span>
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    Table: {event.table}
                  </div>
                  {event.payload && (
                    <div className="mt-1 text-gray-600">
                      {JSON.stringify(event.payload).substring(0, 50)}...
                    </div>
                  )}
                </div>
              ))}
              
              {realtimeEvents.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No real-time events logged yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded">D</kbd> to toggle debug panel
        </div>
      </div>
    </div>
  );
});

DebugPanel.displayName = 'DebugPanel';

export default DebugPanel;