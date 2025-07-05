import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, createQuery, createSingleQuery } from '../lib/supabase';
import type { InventoryItem, Category, Transaction, MaintenanceSchedule, LowStockAlert } from '../types';
import { toast } from 'react-hot-toast';

export const useInventory = () => {
  const queryClient = useQueryClient();

  // Queries with better error handling and fallbacks
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => createQuery(
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: () => createQuery(
      supabase
        .from('inventory_items')
        .select(`
          *,
          category:categories(*)
        `)
        .order('name')
    ),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
    retryDelay: 1000,
  });

  // Simplified transactions query with fallback
  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        // Try the function approach first
        const { data: functionData, error: functionError } = await supabase.rpc('get_transaction_with_details', {
          limit_count: 100
        });

        if (!functionError && functionData) {
          // Transform function result to match expected format
          const transformedData = functionData.map((row: any) => ({
            id: row.id,
            item_id: row.item_id,
            user_id: row.user_id,
            transaction_type: row.transaction_type,
            quantity: row.quantity,
            due_date: row.due_date,
            returned_date: row.returned_date,
            status: row.status,
            notes: row.notes,
            approved_by: row.approved_by,
            approved_at: row.approved_at,
            location_used: row.location_used,
            condition_on_return: row.condition_on_return,
            created_at: row.created_at,
            updated_at: row.updated_at,
            item: row.item_name ? {
              id: row.item_id,
              name: row.item_name,
              description: row.item_description,
              location: row.item_location,
              status: row.item_status,
              category: row.category_name ? { name: row.category_name } : null
            } : null,
            user: row.user_full_name ? {
              user_id: row.user_id,
              full_name: row.user_full_name,
              email: row.user_email,
              role: row.user_role,
              department: row.user_department
            } : null
          }));

          return { data: transformedData, error: null };
        }

        // Fallback to simple query without joins
        console.warn('Function not available, using simple query');
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (transError) throw transError;

        // Return transactions without related data for now
        const simpleTransactions = (transactions || []).map(t => ({
          ...t,
          item: null,
          user: null
        }));

        return { data: simpleTransactions, error: null };
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return { data: [], error: error.message };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    retryDelay: 1000,
  });

  // Simplified maintenance query
  const maintenanceQuery = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      try {
        // Try the function approach first
        const { data: functionData, error: functionError } = await supabase.rpc('get_maintenance_with_details', {
          limit_count: 100
        });

        if (!functionError && functionData) {
          return { data: functionData, error: null };
        }

        // Fallback to simple query
        console.warn('Maintenance function not available, using simple query');
        const { data: maintenance, error: maintError } = await supabase
          .from('maintenance_schedules')
          .select('*')
          .order('scheduled_date', { ascending: false });

        if (maintError) throw maintError;

        return { data: maintenance || [], error: null };
      } catch (error: any) {
        console.error('Error fetching maintenance:', error);
        return { data: [], error: error.message };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    retryDelay: 1000,
  });

  const lowStockAlertsQuery = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => createQuery(
      supabase
        .from('low_stock_alerts')
        .select(`
          *,
          item:inventory_items(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    ),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
    retryDelay: 1000,
  });

  // Real-time subscriptions with better error handling
  useEffect(() => {
    let inventorySubscription: any = null;
    let transactionSubscription: any = null;
    let alertsSubscription: any = null;
    let categoriesSubscription: any = null;

    try {
      inventorySubscription = supabase
        .channel('inventory_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'inventory_items' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          }
        )
        .subscribe();

      transactionSubscription = supabase
        .channel('transaction_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }
        )
        .subscribe();

      alertsSubscription = supabase
        .channel('alerts_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'low_stock_alerts' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          }
        )
        .subscribe();

      categoriesSubscription = supabase
        .channel('categories_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
          }
        )
        .subscribe();
    } catch (error) {
      console.warn('Real-time subscriptions not available:', error);
    }

    return () => {
      try {
        inventorySubscription?.unsubscribe();
        transactionSubscription?.unsubscribe();
        alertsSubscription?.unsubscribe();
        categoriesSubscription?.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from real-time:', error);
      }
    };
  }, [queryClient]);

  // Mutations with better error handling
  const createItemMutation = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'qr_code'>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;

      // Update inventory quantity for checkout/checkin
      try {
        if (transaction.transaction_type === 'checkout') {
          await supabase.rpc('update_inventory_quantity', {
            item_id: transaction.item_id,
            quantity_change: -transaction.quantity
          });
        } else if (transaction.transaction_type === 'checkin') {
          await supabase.rpc('update_inventory_quantity', {
            item_id: transaction.item_id,
            quantity_change: transaction.quantity
          });
        }
      } catch (rpcError) {
        console.warn('RPC function not available, updating manually');
        // Fallback to manual update
        const { data: item } = await supabase
          .from('inventory_items')
          .select('quantity')
          .eq('id', transaction.item_id)
          .single();

        if (item) {
          const newQuantity = transaction.transaction_type === 'checkout' 
            ? Math.max(0, item.quantity - transaction.quantity)
            : item.quantity + transaction.quantity;

          await supabase
            .from('inventory_items')
            .update({ quantity: newQuantity })
            .eq('id', transaction.item_id);
        }
      }

      return data;
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
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);
      
      if (error) throw error;
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
    const items = inventoryQuery.data?.data || [];
    const transactions = transactionsQuery.data?.data || [];
    const alerts = lowStockAlertsQuery.data?.data || [];

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
    const items = inventoryQuery.data?.data || [];
    return items.filter(item => item.quantity <= item.min_quantity);
  }, [inventoryQuery.data]);

  const criticalItems = useMemo(() => {
    const items = inventoryQuery.data?.data || [];
    return items.filter(item => item.quantity <= item.min_quantity * 0.5);
  }, [inventoryQuery.data]);

  return {
    // Data with safe defaults
    categories: categoriesQuery.data?.data || [],
    items: inventoryQuery.data?.data || [],
    transactions: transactionsQuery.data?.data || [],
    maintenance: maintenanceQuery.data?.data || [],
    alerts: lowStockAlertsQuery.data?.data || [],
    
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