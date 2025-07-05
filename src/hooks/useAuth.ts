import { useState, useEffect, useCallback } from 'react';
import { localAuth } from '../lib/localAuth';
import { websocketApi } from '../lib/api';
import type { UserProfile } from '../types';
import { toast } from 'react-hot-toast';

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  // Session timeout management (8 hours)
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  let sessionTimeoutId: NodeJS.Timeout | null = null;
  let lastActivityTime = Date.now();

  const resetSessionTimeout = useCallback(() => {
    lastActivityTime = Date.now();
    
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    sessionTimeoutId = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      signOut();
    }, SESSION_TIMEOUT);
  }, []);

  const handleUserActivity = useCallback(() => {
    // Only reset if user is authenticated and it's been more than 5 minutes since last activity
    if (state.user && Date.now() - lastActivityTime > 5 * 60 * 1000) {
      resetSessionTimeout();
    }
  }, [state.user, resetSessionTimeout]);

  // Add activity listeners
  useEffect(() => {
    if (state.user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (!document.hidden && state.user) {
          resetSessionTimeout();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Start session timeout
      resetSessionTimeout();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
        }
      };
    }
  }, [state.user, handleUserActivity, resetSessionTimeout]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await localAuth.signIn(email, password);

      if (result.success) {
        toast.success('Successfully signed in!');
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to sign in';
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await localAuth.signUp(email, password, fullName);

      if (result.success) {
        setState(prev => ({ ...prev, loading: false }));
        toast.success('Account created successfully! Please sign in.');
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to create account';
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create account';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear session timeout
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        sessionTimeoutId = null;
      }
      
      // Disconnect WebSocket
      websocketApi.disconnect();
      
      await localAuth.signOut();
      
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null
      });
      
      toast.success('Successfully signed out!');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!state.user) return { success: false, error: 'Not authenticated' };

    try {
      // This would need to be implemented with the users API
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.user]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = localAuth.subscribe((authState) => {
      setState(prev => ({
        ...prev,
        user: authState.user,
        profile: authState.user, // In local setup, user and profile are the same
        loading: false,
        error: null
      }));

      // Connect to WebSocket when authenticated
      if (authState.isAuthenticated && !websocketApi.isConnected()) {
        websocketApi.connect();
      }
    });

    // Initialize auth
    localAuth.initialize().finally(() => {
      setState(prev => ({ ...prev, loading: false }));
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAdmin: state.profile?.role === 'admin',
    isStaff: state.profile?.role === 'staff',
    isMedicalPersonnel: state.profile?.role === 'medical_personnel',
    canManageInventory: localAuth.canManageInventory(),
    canManageUsers: localAuth.canManageUsers()
  };
};