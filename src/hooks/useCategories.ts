import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; // Added useQuery
import { categoriesApi } from '../lib/api'; // Import specific categoriesApi
import type { Category } from '../types';
import { toast } from 'react-hot-toast';

export const useCategories = () => {
  const queryClient = useQueryClient();

  // Query to fetch all categories - Added this to make the hook more complete,
  // as it's common to fetch categories in a hook that also mutates them.
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Mutation to create a new category
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => { // Changed 'created_at' to 'createdAt'
      const response = await categoriesApi.create(categoryData); // Use categoriesApi
      if (response.error) { // Check for API response error
        throw new Error(response.error);
      }
      return response.data;
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    }
  });

  // Mutation to update a category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const response = await categoriesApi.update(id, updates); // Use categoriesApi
      if (response.error) { // Check for API response error
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    }
  });

  // Mutation to delete a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await categoriesApi.delete(categoryId); // Use categoriesApi
      if (response.error) { // Check for API response error
        throw new Error(response.error);
      }
      return response.data; // Return data if successful
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    }
  });

  return {
    categories: categoriesQuery.data || [], // Expose categories data
    isLoadingCategories: categoriesQuery.isLoading, // Expose loading state
    categoriesError: categoriesQuery.error, // Expose error state

    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
};
