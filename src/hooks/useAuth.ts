import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { toast } from 'react-hot-toast';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
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

  // Enhanced session persistence with better error handling
  const persistSession = useCallback((session: Session | null) => {
    try {
      if (session) {
        // Store session data in localStorage with expiration
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user,
          stored_at: Date.now()
        };
        localStorage.setItem('supabase.auth.session', JSON.stringify(sessionData));
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      } else {
        localStorage.removeItem('supabase.auth.session');
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  }, []);

  const restoreSession = useCallback(async (): Promise<Session | null> => {
    try {
      const storedSession = localStorage.getItem('supabase.auth.session');
      if (!storedSession) return null;

      const sessionData = JSON.parse(storedSession);
      const now = Date.now();
      
      // Check if session is expired (with 5 minute buffer)
      if (sessionData.expires_at && sessionData.expires_at * 1000 < now + 5 * 60 * 1000) {
        console.log('Stored session expired, attempting refresh...');
        
        // Try to refresh the session
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: sessionData.refresh_token
        });
        
        if (error || !data.session) {
          console.log('Session refresh failed:', error?.message);
          localStorage.removeItem('supabase.auth.session');
          localStorage.removeItem('supabase.auth.token');
          return null;
        }
        
        // Update stored session
        persistSession(data.session);
        return data.session;
      }
      
      // Session is still valid, restore it
      return {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        user: sessionData.user,
        token_type: 'bearer'
      } as Session;
      
    } catch (error) {
      console.warn('Failed to restore session:', error);
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase.auth.token');
      return null;
    }
  }, [persistSession]);

  // Add activity listeners with improved session persistence
  useEffect(() => {
    if (state.user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      // Handle page visibility changes to maintain session
      const handleVisibilityChange = () => {
        if (!document.hidden && state.user) {
          // Page became visible, check and refresh session if needed
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              persistSession(session);
              resetSessionTimeout();
            } else {
              // Try to restore from localStorage
              restoreSession().then(restoredSession => {
                if (restoredSession) {
                  setState(prev => ({
                    ...prev,
                    session: restoredSession,
                    user: restoredSession.user
                  }));
                  resetSessionTimeout();
                }
              });
            }
          });
        }
      };

      // Handle beforeunload to persist session
      const handleBeforeUnload = () => {
        if (state.session) {
          persistSession(state.session);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Start session timeout
      resetSessionTimeout();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
        }
      };
    }
  }, [state.user, state.session, handleUserActivity, resetSessionTimeout, persistSession, restoreSession]);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, return null - don't create default profile
        // The database operator will handle role assignment
        if (error.code === 'PGRST116') {
          console.log('Profile not found - awaiting administrator setup');
          return null;
        }
        return null;
      }
      
      console.log('Profile fetched successfully:', data);
      return data;
    } catch (error: any) {
      console.error('Exception fetching user profile:', error);
      return null;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Store session info in localStorage for persistence
      if (data.session) {
        persistSession(data.session);
      }

      toast.success('Successfully signed in!');
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [persistSession]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Sign up the user without role - role will be set by database operator
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (authError) throw authError;

      // Create a basic user profile without role - awaiting administrator assignment
      if (authData.user) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: authData.user.id,
              email: email,
              full_name: fullName,
              role: null, // No role assigned - database operator will set this
              is_active: false // Inactive until administrator approves
            });

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            toast.warning('Account created but requires administrator setup.');
          }
        } catch (profileErr) {
          console.error('Profile creation error:', profileErr);
        }
      }

      setState(prev => ({ ...prev, loading: false }));
      toast.success('Account created! Please contact your administrator for role assignment and activation.');
      return { success: true };
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
      
      // Clear localStorage
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase.auth.token');
      
      await supabase.auth.signOut();
      setState({
        user: null,
        session: null,
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
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', state.user.id);

      if (error) throw error;

      // Refetch profile
      const updatedProfile = await fetchUserProfile(state.user.id);
      setState(prev => ({ ...prev, profile: updatedProfile }));

      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [state.user, fetchUserProfile]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Enhanced session initialization with better persistence
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // First try to restore session from localStorage
        const restoredSession = await restoreSession();
        
        if (restoredSession && mounted) {
          console.log('Restored session from localStorage');
          setState(prev => ({
            ...prev,
            session: restoredSession,
            user: restoredSession.user,
            loading: true // Keep loading while fetching profile
          }));
          
          // Fetch profile for restored session
          try {
            const profile = await fetchUserProfile(restoredSession.user.id);
            if (mounted) {
              setState(prev => ({
                ...prev,
                profile,
                loading: false
              }));
            }
          } catch (error) {
            console.error('Error fetching profile for restored session:', error);
            if (mounted) {
              setState(prev => ({ ...prev, loading: false }));
            }
          }
          return;
        }
        
        // If no restored session, try to get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setState(prev => ({ ...prev, loading: false, error: error.message }));
          }
          return;
        }

        console.log('Current session:', session?.user?.id || 'No session');

        if (mounted) {
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            loading: !!session // Only keep loading if we have a session and need to fetch profile
          }));
        }

        if (session?.user && mounted) {
          console.log('Fetching profile for current session...');
          
          // Persist the session
          persistSession(session);
          
          // Add timeout to prevent infinite loading
          timeoutId = setTimeout(() => {
            if (mounted) {
              console.log('Profile fetch timeout, proceeding without profile');
              setState(prev => ({ ...prev, loading: false }));
            }
          }, 15000); // 15 second timeout

          try {
            const profile = await fetchUserProfile(session.user.id);
            if (mounted) {
              clearTimeout(timeoutId);
              setState(prev => ({
                ...prev,
                profile,
                loading: false
              }));
            }
          } catch (error) {
            console.error('Error fetching profile in initial session:', error);
            if (mounted) {
              clearTimeout(timeoutId);
              setState(prev => ({ ...prev, loading: false }));
            }
          }
        } else if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error: any) {
        console.error('Error in initializeAuth:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, error: error.message }));
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes with improved session handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'No user');
        
        if (!mounted) return;

        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Handle different auth events
        if (event === 'TOKEN_REFRESHED') {
          // Update localStorage with new session
          if (session) {
            persistSession(session);
          }
          // Don't show loading for token refresh, just update session
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null
          }));
          return;
        }

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('supabase.auth.session');
          localStorage.removeItem('supabase.auth.token');
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null
          });
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          // Store session in localStorage
          persistSession(session);
        }

        // For SIGNED_IN and other events
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: !!session, // Show loading only if we have a session and need to fetch profile
          error: null
        }));

        if (session?.user && mounted) {
          console.log('Fetching profile for auth state change...');
          
          // Add timeout to prevent infinite loading
          timeoutId = setTimeout(() => {
            if (mounted) {
              console.log('Profile fetch timeout after auth change, proceeding without profile');
              setState(prev => ({ ...prev, loading: false }));
            }
          }, 15000); // 15 second timeout

          try {
            const profile = await fetchUserProfile(session.user.id);
            if (mounted) {
              clearTimeout(timeoutId);
              setState(prev => ({
                ...prev,
                profile,
                loading: false
              }));
            }
          } catch (error) {
            console.error('Error fetching profile after auth change:', error);
            if (mounted) {
              clearTimeout(timeoutId);
              setState(prev => ({ ...prev, loading: false }));
            }
          }
        } else if (mounted) {
          setState(prev => ({
            ...prev,
            profile: null,
            loading: false
          }));
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, persistSession, restoreSession]);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAdmin: state.profile?.role === 'admin',
    isStaff: state.profile?.role === 'staff',
    isMedicalPersonnel: state.profile?.role === 'medical_personnel',
    canManageInventory: state.profile?.role === 'admin' || state.profile?.role === 'staff',
    canManageUsers: state.profile?.role === 'admin'
  };
};