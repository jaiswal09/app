import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, usersApi } from '../lib/api'; // Import authApi specifically for getProfile
import type { UserProfile } from '../types'; // Assuming you have a types.ts file for UserProfile
import { toast } from 'react-hot-toast';

export const useUsers = () => {
  const queryClient = useQueryClient();

  // Query to fetch all user profiles
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await usersApi.getAll(); // Use usersApi for getAll
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Query to fetch current user session
  const currentUserQuery = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        // FIX: Changed '/auth/me' to '/auth/profile' and used authApi
        const response = await authApi.getProfile(); 
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Mutation to create a new user
  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; fullName: string; role: string; department?: string; phoneNumber?: string }) => {
      try {
        // Create user account and profile in one API call
        const response = await usersApi.create(userData); // Use usersApi for create
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
    },
    onError: (error: any) => {
      console.error('User creation error:', error);
      toast.error(error.message || 'Failed to create user');
    }
  });

  // Mutation to update user profile
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserProfile> }) => {
      try {
        const response = await usersApi.update(id, updates); // Use usersApi for update
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] }); // Invalidate current user too
      toast.success('User updated successfully!');
    },
    onError: (error: any) => {
      console.error('User update error:', error);
      toast.error(error.message || 'Failed to update user');
    }
  });

  // Mutation to delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        const response = await usersApi.delete(userId); // Use usersApi for delete
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data; // Return data if successful
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully!');
    },
    onError: (error: any) => {
      console.error('User deletion error:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  });

  // Mutation to toggle user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      try {
        // FIX: Ensure 'isActive' is correctly mapped to 'is_active' if your backend expects it this way for updates
        const response = await usersApi.update(id, { is_active: isActive }); // Use usersApi for update, map to is_active
        if (response.error) { // Check for API response error
          throw new Error(response.error);
        }
        return response.data;
      } catch (error) {
        console.error('Error toggling user status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] }); // Invalidate current user too
      toast.success('User status updated successfully!');
    },
    onError: (error: any) => {
      console.error('User status update error:', error);
      toast.error(error.message || 'Failed to update user status');
    }
  });

  // Helper functions
  const getUserById = (id: string) => {
    // Ensure data is accessed safely and type-asserted
    const users: UserProfile[] = usersQuery.data || []; // data from api.get('/users') is already array of UserProfile
    return users.find((user: UserProfile) => user.id === id) || null;
  };

  const getUsersByRole = (role: string) => {
    const users: UserProfile[] = usersQuery.data || [];
    return users.filter((user: UserProfile) => user.role === role);
  };

  const getActiveUsers = () => {
    const users: UserProfile[] = usersQuery.data || [];
    return users.filter((user: UserProfile) => user.is_active); // FIX: Changed to user.is_active
  };

  return {
    // Data
    users: usersQuery.data || [], // data from api.get('/users') is already array of UserProfile
    currentUser: currentUserQuery.data || null, // data from authApi.getProfile() is already UserProfile
    
    // Loading states
    isLoadingUsers: usersQuery.isLoading,
    isLoadingCurrentUser: currentUserQuery.isLoading,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
    isTogglingStatus: toggleUserStatusMutation.isPending,
    
    // Error states
    usersError: usersQuery.error,
    currentUserError: currentUserQuery.error,
    
    // Actions
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    toggleUserStatus: toggleUserStatusMutation.mutate,
    
    // Helper functions
    getUserById,
    getUsersByRole,
    getActiveUsers,
    
    // Refetch functions
    refetchUsers: usersQuery.refetch,
    refetchCurrentUser: currentUserQuery.refetch,
  };
};
