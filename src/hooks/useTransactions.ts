import { useMutation, useQueryClient } from '@tanstack/react-query';
// Corrected import: Import 'transactionsApi' directly, not a generic 'api'
import { transactionsApi } from '../lib/api'; 
import type { Transaction } from '../types';
import { toast } from 'react-hot-toast';

export const useTransactions = () => {
  const queryClient = useQueryClient();

  // Mutation to create a transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => { // FIX: Changed 'created_at' and 'updated_at' to 'createdAt' and 'updatedAt' (camelCase)
      // Use the specific transactionsApi client to create a transaction
      // Assuming transactionsApi has a 'create' method as seen in useInventory.ts
      const response = await transactionsApi.create(transactionData); 
      
      // Add error handling similar to useInventory hook
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch data after a successful transaction creation
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Transactions affect inventory
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] }); // May affect alerts
      toast.success('Transaction created successfully!');
    },
    onError: (error: any) => {
      // Display a toast notification for errors
      toast.error(error.message || 'Failed to create transaction');
    }
  });

  return {
    // Expose the mutation function and its pending state
    createTransaction: createTransactionMutation.mutate,
    isCreatingTransaction: createTransactionMutation.isPending,
  };
};
