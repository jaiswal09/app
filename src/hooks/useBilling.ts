import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi, inventoryApi, websocketApi } from '../lib/api'; // Import specific APIs
import type { Bill, BillPayment, InventoryItem } from '../types'; // Import necessary types
import { toast } from 'react-hot-toast';

export const useBilling = () => {
  const queryClient = useQueryClient();

  // Query to fetch all bills
  const billsQuery = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const response = await billsApi.getAll(); // Use billsApi
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.bills || []; // Assuming backend returns { bills: [...] }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Query to fetch available items for billing (now from inventoryApi)
  const availableItemsQuery = useQuery({
    queryKey: ['available-items-billing'],
    queryFn: async () => {
      try {
        const response = await inventoryApi.getAll({
          // Add parameters to filter for available items if your API supports it
          // Otherwise, filter on the client side after fetching all
          quantityGt: 0, // Assuming your backend can filter by quantity > 0
          unitPriceGt: 0, // Assuming your backend can filter by unit_price > 0
          status: 'available' // Assuming your backend can filter by status
        });

        if (response.error) {
          throw new Error(response.error);
        }

        // If backend filtering is not robust, perform client-side filtering
        const items: InventoryItem[] = response.data?.items || []; // Assuming response.data.items
        const transformedItems = items
          .filter(item => 
            item.quantity > 0 && 
            (item.unitPrice || 0) > 0 && // Use unitPrice (camelCase)
            item.status === 'available'
          )
          .map(item => ({
            ...item,
            categoryName: item.category?.name || 'Uncategorized' // Use categoryName (camelCase)
          }));

        return transformedItems; // Return the filtered and transformed array directly
      } catch (error: any) {
        console.error('Error fetching available items:', error);
        throw error; // Re-throw to be caught by useQuery's onError
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });

  // Real-time subscription for bill changes
  useEffect(() => {
    // Ensure WebSocket is connected when the component mounts
    if (!websocketApi.isConnected()) {
      websocketApi.connect();
    }

    const unsubscribe = websocketApi.subscribe((message) => {
      const { type, data } = message;
      
      // Invalidate queries based on the type of real-time update
      switch (type) {
        case 'bill_created':
        case 'bill_updated':
        case 'bill_deleted':
        case 'bill_payment_added': // Assuming this event type
          queryClient.invalidateQueries({ queryKey: ['bills'] });
          // If bill creation/update/deletion affects inventory, invalidate inventory queries too
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          break;
        case 'inventory_updated': // If inventory changes directly affect available items for billing
          queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
          break;
        default:
          // Log unknown message types for debugging
          console.warn('Unknown WebSocket message type in useBilling:', type, data);
          break;
      }
    });

    return () => {
      unsubscribe(); // Unsubscribe from WebSocket when the component unmounts
    };
  }, [queryClient]); // Dependency array: re-run effect if queryClient changes (unlikely)

  // Mutation to create a new bill with inventory updates
  const createBillMutation = useMutation({
    mutationFn: async (billData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'items' | 'payments'> & { items: any[] }) => { // Type billData
      // Log the data being sent to the backend for debugging
      console.log('Sending bill data to backend:', billData); 
      const response = await billsApi.create(billData); 

      if (response.error) {
        console.error('Bill creation error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Bill creation affects inventory
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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Bill> & { items?: any[] } }) => { // Type updates
      // Ensure updates fields match the backend schema (e.g., customerName, billDate)
      const response = await billsApi.update(id, updates);

      if (response.error) {
        console.error('Bill update error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Bill update affects inventory
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
      const response = await billsApi.delete(billId);
      
      if (response.error) {
        console.error('Bill deletion error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Bill deletion affects inventory
      queryClient.invalidateQueries({ queryKey: ['available-items-billing'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Bill deleted successfully! Inventory quantities restored.');
    },
    onError: (error: any) => {
      console.error('Bill deletion error:', error);
      toast.error(error.message || 'Failed to delete bill');
    }
  });

  // Mutation to add payment
  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: Omit<BillPayment, 'id' | 'createdAt' | 'updatedAt'> & { billId: string }) => { // Type paymentData
      const response = await billsApi.addPayment(paymentData.billId, paymentData); // Use billsApi.addPayment
      
      if (response.error) {
        console.error('Add payment error:', response.error);
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Payment added successfully!');
    },
    onError: (error: any) => {
      console.error('Add payment error:', error);
      toast.error(error.message || 'Failed to add payment');
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const bills: Bill[] = billsQuery.data || []; // Explicitly type bills
    
    const totalBills = bills.length;
    // Use camelCase properties as per your types and backend response
    const totalRevenue = bills
      .filter((bill: Bill) => bill.paymentStatus === 'paid') // Type bill
      .reduce((sum: number, bill: Bill) => sum + bill.totalAmount, 0); // Type sum and bill
    const pendingAmount = bills
      .filter((bill: Bill) => bill.paymentStatus === 'pending') // Type bill
      .reduce((sum: number, bill: Bill) => sum + bill.totalAmount, 0); // Type sum and bill
    const overdueBills = bills.filter((bill: Bill) => bill.status === 'overdue').length; // Type bill

    return {
      totalBills,
      totalRevenue,
      pendingAmount,
      overdueBills
    };
  }, [billsQuery.data]);

  return {
    // Data
    bills: billsQuery.data || [],
    availableItems: availableItemsQuery.data || [], // availableItemsQuery now returns the array directly
    
    // Loading states
    isLoading: billsQuery.isLoading || availableItemsQuery.isLoading,
    isLoadingAvailableItems: availableItemsQuery.isLoading,
    isCreatingBill: createBillMutation.isPending,
    isUpdatingBill: updateBillMutation.isPending,
    isDeletingBill: deleteBillMutation.isPending,
    isAddingPayment: addPaymentMutation.isPending,
    
    // Error states
    error: billsQuery.error || availableItemsQuery.error || createBillMutation.error || updateBillMutation.error || deleteBillMutation.error || addPaymentMutation.error,
    
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
