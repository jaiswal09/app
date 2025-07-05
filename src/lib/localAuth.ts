import { authApi } from './api';

interface User {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  phoneNumber?: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Auth state management
let authState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

// Auth listeners
let authListeners: Array<(state: AuthState) => void> = [];

// Load initial auth state from localStorage
const loadAuthState = (): AuthState => {
  try {
    const token = localStorage.getItem('auth_token');
    const userProfile = localStorage.getItem('user_profile');
    
    if (token && userProfile) {
      const user = JSON.parse(userProfile);
      return {
        user,
        token,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
    // Clear corrupted data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
};

// Save auth state to localStorage
const saveAuthState = (state: AuthState) => {
  if (state.token && state.user) {
    localStorage.setItem('auth_token', state.token);
    localStorage.setItem('user_profile', JSON.stringify(state.user));
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
  }
};

// Clear auth state
const clearAuthState = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_profile');
  authState = {
    user: null,
    token: null,
    isAuthenticated: false,
  };
  notifyListeners();
};

// Notify auth listeners
const notifyListeners = () => {
  authListeners.forEach(listener => listener(authState));
};

// Initialize auth state
authState = loadAuthState();

// Auth API wrapper
export const localAuth = {
  // Get current auth state
  getState: (): AuthState => ({ ...authState }),

  // Subscribe to auth state changes
  subscribe: (listener: (state: AuthState) => void) => {
    authListeners.push(listener);
    // Immediately call with current state
    listener(authState);
    
    // Return unsubscribe function
    return () => {
      authListeners = authListeners.filter(l => l !== listener);
    };
  },

  // Sign in
  signIn: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.error) {
        return { success: false, error: response.error };
      }

      if (response.data?.token && response.data?.user) {
        authState = {
          user: response.data.user,
          token: response.data.token,
          isAuthenticated: true,
        };
        
        saveAuthState(authState);
        notifyListeners();
        
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  },

  // Sign up
  signUp: async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.register(email, password, fullName);
      
      if (response.error) {
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearAuthState();
    }
  },

  // Refresh token
  refreshToken: async (): Promise<boolean> => {
    if (!authState.token) {
      return false;
    }

    try {
      const response = await authApi.refreshToken(authState.token);
      
      if (response.error || !response.data?.token) {
        clearAuthState();
        return false;
      }

      authState = {
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
      };
      
      saveAuthState(authState);
      notifyListeners();
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthState();
      return false;
    }
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User | null> => {
    if (!authState.isAuthenticated || !authState.token) {
      return null;
    }

    try {
      const response = await authApi.getProfile();
      
      if (response.error || !response.data) {
        // Token might be invalid, try to refresh
        const refreshed = await localAuth.refreshToken();
        if (!refreshed) {
          return null;
        }
        
        // Try again with new token
        const retryResponse = await authApi.getProfile();
        if (retryResponse.error || !retryResponse.data) {
          clearAuthState();
          return null;
        }
        
        authState.user = retryResponse.data;
        saveAuthState(authState);
        notifyListeners();
        
        return retryResponse.data;
      }

      // Update user data if different
      if (JSON.stringify(authState.user) !== JSON.stringify(response.data)) {
        authState.user = response.data;
        saveAuthState(authState);
        notifyListeners();
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      clearAuthState();
      return null;
    }
  },

  // Check if user has specific role
  hasRole: (role: string): boolean => {
    return authState.user?.role === role;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (roles: string[]): boolean => {
    return authState.user ? roles.includes(authState.user.role) : false;
  },

  // Check if user can manage inventory
  canManageInventory: (): boolean => {
    return localAuth.hasAnyRole(['admin', 'staff']);
  },

  // Check if user can manage users
  canManageUsers: (): boolean => {
    return localAuth.hasRole('admin');
  },

  // Initialize auth (check token validity)
  initialize: async (): Promise<void> => {
    if (authState.token) {
      // Verify token is still valid
      await localAuth.getCurrentUser();
    }
  },
};

// Auto-refresh token every 30 minutes
setInterval(async () => {
  if (authState.isAuthenticated) {
    await localAuth.refreshToken();
  }
}, 30 * 60 * 1000);

export default localAuth;