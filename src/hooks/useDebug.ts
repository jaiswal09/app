import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { DebugInfo, ConnectionStatus } from '../types';

let requestId = 0;
const debugRequests: DebugInfo['apiRequests'] = [];
const realtimeEvents: DebugInfo['realtimeEvents'] = [];

export const useDebug = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionStatus: {
      online: navigator.onLine,
      supabaseConnected: false,
      realtimeConnected: false
    },
    apiRequests: [],
    realtimeEvents: [],
    environment: {}
  });

  const [isVisible, setIsVisible] = useState(false);

  // Connection status checking
  const checkConnectionStatus = useCallback(async (): Promise<ConnectionStatus> => {
    const startTime = Date.now();
    
    try {
      // Test basic Supabase connection
      const { error } = await supabase.from('categories').select('count').limit(1);
      const latency = Date.now() - startTime;
      
      const status: ConnectionStatus = {
        online: navigator.onLine,
        supabaseConnected: !error,
        realtimeConnected: true, // Simplified check
        lastPing: Date.now(),
        latency
      };
      
      return status;
    } catch (error) {
      return {
        online: navigator.onLine,
        supabaseConnected: false,
        realtimeConnected: false,
        lastPing: Date.now(),
        latency: Date.now() - startTime
      };
    }
  }, []);

  // API request interceptor
  const logApiRequest = useCallback((method: string, url: string, status: number, duration: number, error?: string) => {
    const request = {
      id: (++requestId).toString(),
      method,
      url,
      status,
      duration,
      timestamp: new Date().toISOString(),
      error
    };
    
    debugRequests.unshift(request);
    if (debugRequests.length > 50) debugRequests.pop(); // Keep only last 50
    
    setDebugInfo(prev => ({
      ...prev,
      apiRequests: [...debugRequests]
    }));
  }, []);

  // Realtime event interceptor
  const logRealtimeEvent = useCallback((type: string, table: string, eventType: string, payload?: any) => {
    const event = {
      id: Date.now().toString(),
      type,
      table,
      eventType,
      timestamp: new Date().toISOString(),
      payload
    };
    
    realtimeEvents.unshift(event);
    if (realtimeEvents.length > 30) realtimeEvents.pop(); // Keep only last 30
    
    setDebugInfo(prev => ({
      ...prev,
      realtimeEvents: [...realtimeEvents]
    }));
  }, []);

  // Environment info
  const updateEnvironmentInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;
      
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        userProfile = data;
      }

      setDebugInfo(prev => ({
        ...prev,
        environment: {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          projectId: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0],
          userId: user?.id,
          userRole: userProfile?.role
        }
      }));
    } catch (error) {
      console.warn('Failed to update environment info:', error);
    }
  }, []);

  // Ping test
  const performPingTest = useCallback(async () => {
    const status = await checkConnectionStatus();
    setDebugInfo(prev => ({
      ...prev,
      connectionStatus: status
    }));
    return status;
  }, [checkConnectionStatus]);

  // Clear logs
  const clearLogs = useCallback(() => {
    debugRequests.length = 0;
    realtimeEvents.length = 0;
    setDebugInfo(prev => ({
      ...prev,
      apiRequests: [],
      realtimeEvents: []
    }));
  }, []);

  // Toggle debug panel
  const toggleDebugPanel = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Export debug data
  const exportDebugData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      ...debugInfo
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [debugInfo]);

  useEffect(() => {
    // Initial setup
    updateEnvironmentInfo();
    checkConnectionStatus().then(status => {
      setDebugInfo(prev => ({ ...prev, connectionStatus: status }));
    });

    // Network status listener
    const handleOnlineStatus = () => {
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: {
          ...prev.connectionStatus,
          online: navigator.onLine
        }
      }));
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Simplified realtime monitoring
    let realtimeChannel: any = null;
    
    try {
      realtimeChannel = supabase.channel('debug-monitoring');
      
      realtimeChannel.on('system', {}, (payload: any) => {
        const isConnected = payload.status === 'ok';
        setDebugInfo(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            realtimeConnected: isConnected
          }
        }));
        
        logRealtimeEvent('system', 'debug', payload.status, payload);
      });

      realtimeChannel.subscribe((status: string) => {
        const isConnected = status === 'SUBSCRIBED';
        setDebugInfo(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            realtimeConnected: isConnected
          }
        }));
        
        logRealtimeEvent('subscription', 'debug', status, null);
      });
    } catch (error) {
      console.warn('Realtime monitoring not available:', error);
    }

    // Keyboard shortcut for debug panel (Ctrl/Cmd + Shift + D)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDebugPanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Periodic connection check
    const connectionCheckInterval = setInterval(() => {
      performPingTest();
    }, 60000); // Every 60 seconds (reduced frequency)

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(connectionCheckInterval);
      
      if (realtimeChannel) {
        try {
          realtimeChannel.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from realtime:', error);
        }
      }
    };
  }, [updateEnvironmentInfo, checkConnectionStatus, logRealtimeEvent, toggleDebugPanel, performPingTest]);

  // Simplified fetch interceptor
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = typeof args[1] === 'object' && args[1]?.method ? args[1].method : 'GET';
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        if (url.includes('supabase')) {
          logApiRequest(method, url, response.status, duration);
        }
        
        return response;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        if (url.includes('supabase')) {
          logApiRequest(method, url, 0, duration, error.message);
        }
        
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logApiRequest]);

  return {
    debugInfo,
    isVisible,
    toggleDebugPanel,
    performPingTest,
    clearLogs,
    exportDebugData,
    logApiRequest,
    logRealtimeEvent
  };
};