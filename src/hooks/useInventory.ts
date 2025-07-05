import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  inventoryApi, 
  categoriesApi, 
  transactionsApi, 
  maintenanceApi, 
  alertsApi,
  websocketApi 
} from '../lib/api';
import type { InventoryItem, Category, Transaction, MaintenanceSchedule, LowStockAlert } from '../types';
import { toast } from 'react-hot-toast';

export const useInventory = () => {
  const queryClient = useQueryClient();

export const useInventory = () => {
  const queryClient = useQueryClient();

  // Queries with better error handling and fallbacks
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
    retryDelay: 1000,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryApi.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.items || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
    retryDelay: 1000,
  });

  // Simplified transactions query
  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await transactionsApi.getAll({ limit: 100 });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.transactions || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    retryDelay: 1000,
  });

  // Simplified maintenance query
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const response = await maintenanceApi.getAll({ limit: 100 });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.maintenanceSchedules || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    retryDelay: 1000,
  });

  const lowStockAlertsQuery = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const response = await alertsApi.getAll({ status: 'active' });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.alerts || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
    retryDelay: 1000,
  });

  // Real-time subscriptions with WebSocket
  useEffect(() => {
    const unsubscribe = websocketApi.subscribe((message) => {
      const { type, data } = message;
      
      switch (type) {
        case 'inventory_created':
        case 'inventory_updated':
        case 'inventory_deleted':
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          break;
          
        case 'transaction_created':
        case 'transaction_updated':
        case 'transaction_approved':
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          break;
          
        case 'category_created':
        case 'category_updated':
        case 'category_deleted':
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          break;
          
        case 'maintenance_created':
        case 'maintenance_updated':
        case 'maintenance_deleted':
          queryClient.invalidateQueries({ queryKey: ['maintenance'] });
          break;
          
        case 'low_stock_alert':
        case 'alert_acknowledged':
        case 'alert_resolved':
          queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          break;
          
        default:
          break;
      }
    });

    // Ensure WebSocket is connected
    if (!websocketApi.isConnected()) {
      websocketApi.connect();
    }

    return unsubscribe;
  }, [queryClient]);

  // Mutations with better error handling
  const createItemMutation = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'qr_code'>) => {
      const response = await inventoryApi.create(item);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create item');
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const response = await inventoryApi.update(id, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update item');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await inventoryApi.delete(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete item');
    }
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await categoriesApi.create(categoryData);
      if (response.error) {
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

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const response = await categoriesApi.update(id, updates);
      if (response.error) {
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

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await categoriesApi.delete(categoryId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await transactionsApi.create(transaction);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transaction created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create transaction');
    }
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await alertsApi.acknowledge(alertId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Alert acknowledged!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to acknowledge alert');
    }
  });

  // Computed values with safe defaults
  const stats = useMemo(() => {
    const items = inventoryQuery.data || [];
    const transactions = transactionsQuery.data || [];
    const alerts = lowStockAlertsQuery.data || [];

    const totalItems = items.length;
    const lowStockItems = alerts.filter(alert => alert.status === 'active').length;
    const activeTransactions = transactions.filter(t => t.status === 'active').length;
    const overdueItems = transactions.filter(t => t.status === 'overdue').length;
    const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);

    return {
      totalItems,
      lowStockItems,
      activeTransactions,
      overdueItems,
      totalValue
    };
  }, [inventoryQuery.data, transactionsQuery.data, lowStockAlertsQuery.data]);

  const lowStockItems = useMemo(() => {
    const items = inventoryQuery.data || [];
    return items.filter(item => item.quantity <= item.min_quantity);
  }, [inventoryQuery.data]);

  const criticalItems = useMemo(() => {
    const items = inventoryQuery.data || [];
    return items.filter(item => item.quantity <= item.min_quantity * 0.5);
  }, [inventoryQuery.data]);

  return {
    // Data with safe defaults
    categories: categoriesQuery.data || [],
    items: inventoryQuery.data || [],
    transactions: transactionsQuery.data || [],
    maintenance: maintenanceQuery.data || [],
    alerts: lowStockAlertsQuery.data || [],
    
    // Loading states
    isLoading: inventoryQuery.isLoading || categoriesQuery.isLoading,
    isTransactionsLoading: transactionsQuery.isLoading,
    isMaintenanceLoading: maintenanceQuery.isLoading,
    isAlertsLoading: lowStockAlertsQuery.isLoading,
    
    // Error states
    error: inventoryQuery.error || categoriesQuery.error,
    
    // Item mutations
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    
    // Category mutations
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    
    // Other mutations
    createTransaction: createTransactionMutation.mutate,
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    
    // Computed data
    stats,
    lowStockItems,
    criticalItems,
    
    // Loading states for mutations
    isCreatingItem: createItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
    isCreatingTransaction: createTransactionMutation.isPending,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
};