import { useState, useEffect, useCallback } from 'react';
import { websocketApi } from '../lib/api'; // Import your websocketApi
import { useAuth } from './useAuth'; // Assuming useAuth provides user/profile for environment info

// Types for debug info
interface DebugInfo {
  connectionStatus: {
    online: boolean;
    backendConnected: boolean;
    realtimeConnected: boolean;
    databaseConnected: boolean; // Renamed from supabaseConnected for clarity
    latency?: number;
  };
  apiRequests: Array<{
    id: number;
    method: string;
    url: string;
    status: number;
    duration: number;
    timestamp: string;
    error?: string; // Added error property for failed requests
  }>;
  realtimeEvents: Array<{
    id: number;
    type: string;
    data: any;
    timestamp: string;
    // Add more specific fields if your real-time events have them (e.g., eventType, table)
    eventType?: string;
    table?: string;
    payload?: any;
  }>;
  environment: {
    userAgent?: string;
    viewport?: string;
    timestamp?: string;
    projectId?: string; // From environment variables
    userId?: string | null; // From useAuth
    userRole?: string | null; // From useAuth
    nodeEnv?: string; // From import.meta.env.MODE
  };
}

// Using global arrays for logs to persist across hook re-renders
// This is a common pattern for debugging utilities where you want to retain logs
let requestIdCounter = 0; // Use a distinct counter for requests
let eventIdCounter = 0;   // Use a distinct counter for events
const debugRequests: DebugInfo['apiRequests'] = [];
const realtimeEvents: DebugInfo['realtimeEvents'] = [];

export const useDebug = () => {
  const { user, profile } = useAuth(); // Get user and profile from useAuth for environment info

  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionStatus: {
      online: navigator.onLine,
      backendConnected: false,
      realtimeConnected: false,
      databaseConnected: false // Initialize here
    },
    apiRequests: [],
    realtimeEvents: [],
    environment: {}
  });

  const [isVisible, setIsVisible] = useState(false);

  // Connection status checking
  const checkConnectionStatus = useCallback(async () => {
    const startTime = Date.now();
    let backendConnected = false;
    let databaseConnected = false;
    let latency: number | undefined;
    
    try {
      const response = await fetch('http://localhost:3001/health');
      latency = Date.now() - startTime;
      
      if (response.ok) {
        backendConnected = true;
        const healthData = await response.json();
        databaseConnected = healthData.database?.connected || false; // FIX: Read database status
      }
    } catch (error) {
      // Backend connection failed
      backendConnected = false;
      databaseConnected = false;
    }

    return {
      online: navigator.onLine,
      backendConnected,
      realtimeConnected: websocketApi.isConnected(), // Still check WS directly
      databaseConnected, // Include database status
      latency
    };
  }, []);

  // Update connection status periodically AND listen to WebSocket changes
  useEffect(() => {
    const updateAllStatuses = async () => {
      const status = await checkConnectionStatus();
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: {
          ...status, 
          realtimeConnected: websocketApi.isConnected(), // Ensure this is always current
        }
      }));
    };

    updateAllStatuses();
    const interval = setInterval(updateAllStatuses, 3000); // Check every 3 seconds for more responsive status updates

    const handleOnline = () => updateAllStatuses();
    const handleOffline = () => updateAllStatuses();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // FIX: Subscribe to WebSocket events for immediate realtime status updates
    const unsubscribeWs = websocketApi.subscribe((message) => {
      // On any WS message (including pings/pongs from the server), re-check status
      updateAllStatuses(); 
      // Also log the real-time event if it's not a simple ping/pong
      if (typeof message === 'object' && message !== null && message.type) {
        logRealtimeEvent(message); // Pass the full message object
      }
    });


    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeWs(); // Unsubscribe from WebSocket
    };
  }, [checkConnectionStatus]); // Dependency array includes checkConnectionStatus

  // Environment info (updated to include user/role from useAuth)
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      environment: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        projectId: 'your-project-id-here', // FIX: Replace with actual project ID from env if available
        userId: user?.id || null, 
        userRole: profile?.role || null, 
        nodeEnv: import.meta.env.MODE, 
      }
    }));
  }, [user, profile]); // Re-run if user or profile changes

  // Log API request
  const logApiRequest = useCallback((method: string, url: string, status: number, duration: number, error?: string) => {
    const request = {
      id: ++requestIdCounter, // FIX: Use distinct counter
      method,
      url,
      status,
      duration,
      timestamp: new Date().toISOString(),
      error // Include error message if provided
    };

    debugRequests.push(request);
    
    // Keep only last 50 requests
    if (debugRequests.length > 50) {
      debugRequests.shift();
    }

    setDebugInfo(prev => ({
      ...prev,
      apiRequests: [...debugRequests]
    }));
  }, []);

  // Log realtime event
  const logRealtimeEvent = useCallback((eventData: any) => { // FIX: Accept full event data
    const event = {
      id: ++eventIdCounter, // FIX: Use distinct counter
      type: eventData.type, // Assuming eventData has a 'type'
      data: eventData.data, // Assuming eventData has a 'data' payload
      timestamp: new Date().toISOString(),
      eventType: eventData.eventType || eventData.type, // Use eventType if available, else type
      table: eventData.table, // Assuming eventData has a 'table'
      payload: eventData.payload || eventData.data // Assuming eventData has a 'payload' or use data
    };

    realtimeEvents.push(event);
    
    // Keep only last 50 events
    if (realtimeEvents.length > 50) {
      realtimeEvents.shift();
    }

    setDebugInfo(prev => ({
      ...prev,
      realtimeEvents: [...realtimeEvents]
    }));
  }, []);

  // Toggle debug panel visibility
  const toggleDebugPanel = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Clear debug data
  const clearLogs = useCallback(() => { // FIX: Renamed from clearDebugData to match DebugPanel prop
    debugRequests.length = 0;
    realtimeEvents.length = 0;
    setDebugInfo(prev => ({
      ...prev,
      apiRequests: [],
      realtimeEvents: []
    }));
  }, []);

  // Keyboard shortcut to toggle debug panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDebugPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugPanel]);

  // Export debug data
  const exportDebugData = useCallback(() => {
    const data = JSON.stringify(debugInfo, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [debugInfo]);

  return {
    debugInfo,
    isVisible,
    toggleDebugPanel,
    clearLogs, // FIX: Renamed
    exportDebugData,
    logApiRequest,
    logRealtimeEvent,
    // checkConnectionStatus, // No need to expose this directly to components
  };
};
