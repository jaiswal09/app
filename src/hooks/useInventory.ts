import { useEffect, useMemo } from 'react'; // Removed useState, useCallback as they are not directly used
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

  // Queries with better error handling and fallbacks

  // Categories Query
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

  // Inventory Query
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

  // Transactions Query
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

  // Maintenance Query
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

  // Low Stock Alerts Query
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
    // Subscribe to WebSocket messages and invalidate relevant queries
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
          // Log unknown message types for debugging
          console.warn('Unknown WebSocket message type:', type, data);
          break;
      }
    });

    // Ensure WebSocket is connected when the component mounts
    if (!websocketApi.isConnected()) {
      websocketApi.connect();
    }

    // Cleanup function: unsubscribe from WebSocket when the component unmounts
    return () => {
      unsubscribe();
      // Optionally, disconnect WebSocket if no other parts of the app use it
      // websocketApi.disconnect(); 
    };
  }, [queryClient]); // Dependency array: re-run effect if queryClient changes (unlikely)

  // Mutations with better error handling

  // Inventory Item Mutations
  const createItemMutation = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>) => { // FIX: Changed snake_case properties to camelCase
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

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => { // FIX: Changed snake_case properties to camelCase
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

  // Transaction Mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => { // FIX: Changed snake_case properties to camelCase
      const response = await transactionsApi.create(transaction);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Invalidate inventory as transactions affect stock
      toast.success('Transaction created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create transaction');
    }
  });

  // Alert Acknowledgment Mutation
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

  // Computed values with safe defaults using useMemo for performance
  const stats = useMemo(() => {
    const items: InventoryItem[] = inventoryQuery.data || [];
    const transactions: Transaction[] = transactionsQuery.data || [];
    const alerts: LowStockAlert[] = lowStockAlertsQuery.data || [];

    const totalItems = items.length;
    // Filter active alerts for low stock items count
    const lowStockItemsCount = alerts.filter((alert: LowStockAlert) => alert.status === 'active').length;
    // Filter active transactions
    const activeTransactionsCount = transactions.filter((t: Transaction) => t.status === 'active').length;
    // Filter overdue transactions
    const overdueItemsCount = transactions.filter((t: Transaction) => t.status === 'overdue').length;
    // Calculate total value of inventory
    const totalValue = items.reduce((sum: number, item: InventoryItem) => sum + (item.unitPrice || 0) * item.quantity, 0); // FIX: Changed unit_price to unitPrice

    return {
      totalItems,
      lowStockItems: lowStockItemsCount, // Renamed to avoid conflict with lowStockItems computed value
      activeTransactions: activeTransactionsCount,
      overdueItems: overdueItemsCount,
      totalValue
    };
  }, [inventoryQuery.data, transactionsQuery.data, lowStockAlertsQuery.data]);

  // Filter for items below their minimum quantity
  const lowStockItems = useMemo(() => {
    const items: InventoryItem[] = inventoryQuery.data || [];
    return items.filter((item: InventoryItem) => item.quantity <= (item.minQuantity || 0)); // FIX: Changed min_quantity to minQuantity
  }, [inventoryQuery.data]);

  // Filter for items below 50% of their minimum quantity
  const criticalItems = useMemo(() => {
    const items: InventoryItem[] = inventoryQuery.data || [];
    return items.filter((item: InventoryItem) => item.quantity <= (item.minQuantity || 0) * 0.5); // FIX: Changed min_quantity to minQuantity
  }, [inventoryQuery.data]);

  // Return all data, loading states, error states, mutations, and computed values
  return {
    // Data with safe defaults (empty arrays if data is not yet loaded or is undefined)
    categories: categoriesQuery.data || [],
    items: inventoryQuery.data || [],
    transactions: transactionsQuery.data || [],
    maintenance: maintenanceQuery.data || [],
    alerts: lowStockAlertsQuery.data || [],
    
    // Loading states for queries
    isLoading: inventoryQuery.isLoading || categoriesQuery.isLoading || transactionsQuery.isLoading || maintenanceQuery.isLoading || lowStockAlertsQuery.isLoading,
    isCategoriesLoading: categoriesQuery.isLoading,
    isInventoryLoading: inventoryQuery.isLoading,
    isTransactionsLoading: transactionsQuery.isLoading,
    isMaintenanceLoading: maintenanceQuery.isLoading,
    isAlertsLoading: lowStockAlertsQuery.isLoading,
    
    // Error states for queries
    error: inventoryQuery.error || categoriesQuery.error || transactionsQuery.error || maintenanceQuery.error || lowStockAlertsQuery.error,
    categoriesError: categoriesQuery.error,
    inventoryError: inventoryQuery.error,
    transactionsError: transactionsQuery.error,
    maintenanceError: maintenanceQuery.error,
    alertsError: lowStockAlertsQuery.error,
    
    // Item mutations (functions to trigger actions)
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
    
    // Computed data (derived from fetched data)
    stats,
    lowStockItems,
    criticalItems,
    
    // Loading states for mutations (to show pending status in UI)
    isCreatingItem: createItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
    isCreatingTransaction: createTransactionMutation.isPending,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isAcknowledgingAlert: acknowledgeAlertMutation.isPending,
  };
};
