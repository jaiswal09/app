import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api'; // Consider making this configurable via environment variables

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      window.location.href = '/login'; // Consider using router.navigate for SPA
    }
    return Promise.reject(error);
  }
);

// API Response wrapper
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<T>): ApiResponse<T> => {
  return {
    data: response.data,
    error: null,
  };
};

const handleError = <T>(error: any): ApiResponse<T> => { 
  const message = error.response?.data?.error || error.message || 'An error occurred';
  return {
    data: null, // Data is null on error, no need for 'as T' if ApiResponse allows T | null
    error: message,
  };
};

// Authentication API
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  register: async (email: string, password: string, fullName: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/register', { email, password, fullName });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getProfile: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/auth/profile');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  refreshToken: async (token: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/refresh', { token });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  logout: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/logout');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/users');
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/users/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/users', data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/users/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/users/stats/overview');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/categories');
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/categories/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/categories', data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/categories/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/categories/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  toggleStatus: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/categories/${id}/toggle-status`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Inventory API
export const inventoryApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/inventory', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/inventory', data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/inventory/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/inventory/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  updateQuantity: async (id: string, quantity: number, reason?: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/inventory/${id}/quantity`, { quantity, reason });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/inventory/stats/overview');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Transactions API
export const transactionsApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/transactions', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/transactions/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/transactions', data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/transactions/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  approve: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/transactions/${id}/approve`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getUserTransactions: async (userId: string): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get(`/transactions/user/${userId}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  getOverdue: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/transactions/overdue/list');
      return handleResponse(response);
    } catch (error) { 
      return handleError<any[]>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/transactions/stats/overview');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Maintenance API
export const maintenanceApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/maintenance', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/maintenance/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/maintenance', data);
      return handleResponse(response);
    }
    catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/maintenance/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  updateStatus: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/maintenance/${id}/status`, data);
      return handleResponse(response);
    }
    catch (error) { 
      return handleError<any>(error);
    }
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/maintenance/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getUpcoming: async (days?: number): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/maintenance/upcoming/list', { params: { days } });
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  getOverdue: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/maintenance/overdue/list');
      return handleResponse(response);
    } catch (error) { 
      return handleError<any[]>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/maintenance/stats/overview');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/alerts', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/alerts/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  acknowledge: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/alerts/${id}/acknowledge`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  resolve: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/alerts/${id}/resolve`);
      return handleResponse(response); 
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getCritical: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/alerts/critical/list');
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  bulkAcknowledge: async (alertIds: string[]): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch('/alerts/bulk/acknowledge', { alertIds });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  autoCheck: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/alerts/check/auto');
      return handleResponse(response); 
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/alerts/stats/overview');
      return handleResponse(response); 
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// Bills API
export const billsApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/bills', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/bills/${id}`);
      return handleResponse(response);
    }
    catch (error) {
      return handleError<any>(error);
    }
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/bills', data);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/bills/${id}`, data);
      return handleResponse(response);
    } catch (error) { 
      return handleError<any>(error);
    }
  },

  updateStatus: async (id: string, status: string, paymentStatus?: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.patch(`/bills/${id}/status`, { status, paymentStatus });
      return handleResponse(response);
    }
    catch (error) {
      return handleError<any>(error);
    }
  },

  addPayment: async (id: string, paymentData: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post(`/bills/${id}/payments`, paymentData);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/bills/${id}`);
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/bills/stats/overview');
      return handleResponse(response); 
    } catch (error) { 
      return handleError<any>(error);
    }
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/dashboard/stats');
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },

  getActivity: async (limit?: number): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/dashboard/activity', { params: { limit } });
      return handleResponse(response);
    } catch (error) {
      return handleError<any[]>(error);
    }
  },

  getQuickActions: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/dashboard/quick-actions');
      return handleResponse(response);
    } catch (error) { 
      return handleError<any>(error);
    }
  },

  getMetrics: async (period?: number): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/dashboard/metrics', { params: { period } });
      return handleResponse(response);
    } catch (error) {
      return handleError<any>(error);
    }
  },
};

// WebSocket connection for real-time updates
let wsConnection: WebSocket | null = null;
let wsListeners: Array<(data: any) => void> = [];

export const websocketApi = {
  connect: () => {
    if (wsConnection?.readyState === WebSocket.OPEN) {
      return wsConnection;
    }

    // Ensure we don't create multiple connections if one is already connecting
    if (wsConnection && (wsConnection.readyState === WebSocket.CONNECTING || wsConnection.readyState === WebSocket.CLOSING)) {
        console.log('WebSocket is already connecting or closing. Aborting new connection attempt.');
        return wsConnection;
    }

    wsConnection = new WebSocket('ws://localhost:3001');

    wsConnection.onopen = () => {
      console.log('🔗 WebSocket connected');
    };

    // Consolidated onmessage handler
    wsConnection.onmessage = (event) => {
      // Note: The 'ws' library on the backend sends binary pings/pongs that the browser handles automatically.
      // This explicit check is mainly for custom text-based pings, which are not used here.
      // Removed: if (typeof event.data === 'string' && event.data === 'pong') { ... }
      try {
        const data = JSON.parse(event.data);
        wsListeners.forEach(listener => listener(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsConnection.onclose = (event) => {
      console.log('🔌 WebSocket disconnected', event.code, event.reason);
      // Only attempt to reconnect if the disconnection was not intentional (e.g., code 1000 for normal closure)
      if (event.code !== 1000) { // 1000 is normal closure
        console.log('Attempting to reconnect WebSocket in 3 seconds...');
        setTimeout(() => {
          // Check if wsConnection is still null or closed before reconnecting
          if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED) {
            websocketApi.connect();
          }
        }, 3000);
      }
    };

    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Error might lead to onclose, so no explicit reconnect here
    };
    
    // The previous duplicate wsConnection.onmessage handler was removed in the last iteration.
    // This part is now clean.

    return wsConnection;
  },

  disconnect: () => {
    if (wsConnection) {
      // Use code 1000 for normal closure
      wsConnection.close(1000, 'Client initiated disconnect'); 
      wsConnection = null;
    }
    wsListeners = [];
  },

  subscribe: (listener: (data: any) => void) => {
    wsListeners.push(listener);
    // Ensure connection is active when subscribing
    websocketApi.connect(); 
    return () => {
      wsListeners = wsListeners.filter(l => l !== listener);
    };
  },

  isConnected: () => {
    return wsConnection?.readyState === WebSocket.OPEN;
  },
};

// Export the main API instance
export default api;
