import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, createQuery } from '../lib/supabase';
import type { Bill, BillItem, BillPayment } from '../types';
import { toast } from 'react-hot-toast';

export const useBilling = () => {
  const queryClient = useQueryClient();

  // Query to fetch all bills
  const billsQuery = useQuery({
    queryKey: ['bills'],
    queryFn: () => createQuery(
      supabase
        .from('bills')
        .select(`
          *,
          items:bill_items(*),
          payments:bill_payments(*)
        `)
        .order('created_at', { ascending: false })
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Query to fetch available items for billing
  const availableItemsQuery = useQuery({
    queryKey: ['available-items-billing'],
    queryFn: async () => {
      try {
        // Try the RPC function first
        const { data, error } = await supabase.rpc('get_available_items_for_billing');
        if (!error && data) {
          return { data: data || [], error: null };
        }
        
        // Fallback to direct query
        console.warn('RPC function not available, using direct query');
        const { data: items, error: itemsError } = await supabase
          .from('inventory_items')
          .select(`
            id,
            name,
            description,
            quantity,
            unit_price,
            location,
            category:categories(name)
          `)
          .gt('quantity', 0)
          .gt('unit_price', 0)
          .eq('status', 'available')
          .order('name');

        if (itemsError) throw itemsError;

        // Transform to match expected format
        const transformedItems = (items || []).map(item => ({
          ...item,
          category_name: item.category?.name || 'Uncategorized'
        }));

        return { data: transformedItems, error: null };
      } catch (error: any) {
        console.error('Error fetching available items:', error);
        return { data: [], error: error.message };
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });

  // Real-time subscription for bill changes
  useEffect(() => {
    let subscription: any = null;

    try {
      subscription = supabase
        .channel('bills_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bills' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'bill_items' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'bill_payments' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_items' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
          }
        )
        .subscribe();
    } catch (error) {
      console.warn('Real-time subscription for bills not available:', error);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from bills real-time:', error);
      }
    };
  }, [queryClient]);

  // Mutation to create a new bill with inventory updates
  const createBillMutation = useMutation({
    mutationFn: async (billData: any) => {
      // Convert items array to JSON string for the function call
      const itemsJson = JSON.stringify(billData.items || []);
      
      console.log('Creating bill with data:', {
        ...billData,
        items: billData.items
      });
      
      const { data, error } = await supabase.rpc('create_bill_with_inventory_update', {
        p_customer_name: billData.customer_name,
        p_customer_email: billData.customer_email || null,
        p_customer_phone: billData.customer_phone || null,
        p_customer_address: billData.customer_address || null,
        p_bill_date: billData.bill_date,
        p_due_date: billData.due_date || null,
        p_tax_rate: billData.tax_rate || 0,
        p_discount_amount: billData.discount_amount || 0,
        p_notes: billData.notes || null,
        p_status: billData.status || 'draft',
        p_items: itemsJson  // Pass as JSON string
      });

      if (error) {
        console.error('Bill creation error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Bill created successfully! Inventory quantities updated.');
    },
    onError: (error: any) => {
      console.error('Bill creation error:', error);
      toast.error(error.message || 'Failed to create bill');
    }
  });

  // Mutation to update a bill with inventory adjustments
  const updateBillMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Convert items array to JSON string for the function call
      const itemsJson = JSON.stringify(updates.items || []);
      
      const { error } = await supabase.rpc('update_bill_with_inventory_update', {
        p_bill_id: id,
        p_customer_name: updates.customer_name,
        p_customer_email: updates.customer_email || null,
        p_customer_phone: updates.customer_phone || null,
        p_customer_address: updates.customer_address || null,
        p_bill_date: updates.bill_date,
        p_due_date: updates.due_date || null,
        p_tax_rate: updates.tax_rate || 0,
        p_discount_amount: updates.discount_amount || 0,
        p_notes: updates.notes || null,
        p_status: updates.status || 'draft',
        p_items: itemsJson  // Pass as JSON string
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Bill updated successfully! Inventory quantities adjusted.');
    },
    onError: (error: any) => {
      console.error('Bill update error:', error);
      toast.error(error.message || 'Failed to update bill');
    }
  });

  // Mutation to delete a bill with inventory restoration
  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      // Use the ACID-compliant function for bill deletion with inventory restoration
      const { error } = await supabase.rpc('delete_bill_with_inventory_restore', {
        p_bill_id: billId
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Bill deleted successfully! Inventory quantities restored.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete bill');
    }
  });

  // Mutation to add payment
  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: Omit<BillPayment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert(paymentData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Payment added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add payment');
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const bills = billsQuery.data?.data || [];
    
    const totalBills = bills.length;
    const totalRevenue = bills
      .filter(bill => bill.payment_status === 'paid')
      .reduce((sum, bill) => sum + bill.total_amount, 0);
    const pendingAmount = bills
      .filter(bill => bill.payment_status === 'pending')
      .reduce((sum, bill) => sum + bill.total_amount, 0);
    const overdueBills = bills.filter(bill => bill.status === 'overdue').length;

    return {
      totalBills,
      totalRevenue,
      pendingAmount,
      overdueBills
    };
  }, [billsQuery.data]);

  return {
    // Data
    bills: billsQuery.data?.data || [],
    availableItems: availableItemsQuery.data?.data || [],
    
    // Loading states
    isLoading: billsQuery.isLoading,
    isLoadingAvailableItems: availableItemsQuery.isLoading,
    isCreatingBill: createBillMutation.isPending,
    isUpdatingBill: updateBillMutation.isPending,
    isDeletingBill: deleteBillMutation.isPending,
    isAddingPayment: addPaymentMutation.isPending,
    
    // Error states
    error: billsQuery.error,
    
    // Mutations
    createBill: createBillMutation.mutate,
    updateBill: updateBillMutation.mutate,
    deleteBill: deleteBillMutation.mutate,
    addPayment: addPaymentMutation.mutate,
    
    // Statistics
    stats,
    
    // Utility functions
    refetch: billsQuery.refetch,
    refetchAvailableItems: availableItemsQuery.refetch
  };
};