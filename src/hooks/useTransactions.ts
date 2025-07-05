import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';
import { toast } from 'react-hot-toast';

export const useTransactions = () => {
  const queryClient = useQueryClient();

  // Mutation to create a transaction with ACID properties
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      // Use the ACID-compliant function for transaction creation
      const { data, error } = await supabase.rpc('create_transaction_with_inventory_update', {
        p_item_id: transactionData.item_id,
        p_user_id: transactionData.user_id,
        p_transaction_type: transactionData.transaction_type,
        p_quantity: transactionData.quantity,
        p_due_date: transactionData.due_date || null,
        p_location_used: transactionData.location_used || null,
        p_notes: transactionData.notes || null
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast.success('Transaction created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create transaction');
    }
  });

  return {
    createTransaction: createTransactionMutation.mutate,
    isCreatingTransaction: createTransactionMutation.isPending,
  };
};