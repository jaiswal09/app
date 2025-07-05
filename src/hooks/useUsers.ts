import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, createQuery } from '../lib/supabase';
import type { UserProfile } from '../types';
import { toast } from 'react-hot-toast';

export const useUsers = () => {
  const queryClient = useQueryClient();

  // Query to fetch all user profiles
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => createQuery(
      supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Real-time subscription for user changes
  useEffect(() => {
    let subscription: any = null;

    try {
      subscription = supabase
        .channel('user_profiles_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_profiles' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }
        )
        .subscribe();
    } catch (error) {
      console.warn('Real-time subscription for users not available:', error);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from users real-time:', error);
      }
    };
  }, [queryClient]);

  // Mutation to create a new user
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'TempPassword123!', // Temporary password - user should change on first login
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        }
      });

      if (authError) throw authError;

      // Then create the user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          department: userData.department,
          phone_number: userData.phone_number,
          is_active: userData.is_active
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    }
  });

  // Mutation to update a user
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    }
  });

  // Mutation to delete a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First get the user profile to get the auth user_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Delete the auth user (this will cascade to user_profiles due to foreign key)
      const { error: authError } = await supabase.auth.admin.deleteUser(profile.user_id);
      
      if (authError) throw authError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });

  // Mutation to toggle user status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${data.is_active ? 'activated' : 'deactivated'} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    }
  });

  return {
    // Data
    users: usersQuery.data?.data || [],
    
    // Loading states
    isLoading: usersQuery.isLoading,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
    isTogglingStatus: toggleUserStatusMutation.isPending,
    
    // Error states
    error: usersQuery.error,
    
    // Mutations
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    toggleUserStatus: toggleUserStatusMutation.mutate,
    
    // Utility functions
    refetch: usersQuery.refetch
  };
};