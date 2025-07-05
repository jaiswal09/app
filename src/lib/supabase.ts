import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'medical-inventory-system'
    }
  }
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    error: error.message || 'An unexpected error occurred',
    details: error
  };
};

// Type-safe query helper
export const createQuery = <T>(
  query: Promise<{ data: T[] | null; error: any }>
): Promise<{ data: T[]; error: string | null }> => {
  return query.then(({ data, error }) => {
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  });
};

// Single record query helper
export const createSingleQuery = <T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> => {
  return query.then(({ data, error }) => {
    if (error) {
      return { data: null, error: error.message };
    }
    return { data, error: null };
  });
};

// Function to regenerate QR codes if needed
export const regenerateQRCodes = async () => {
  try {
    const { error } = await supabase.rpc('regenerate_qr_codes');
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Function to update inventory quantity safely
export const updateInventoryQuantity = async (itemId: string, quantityChange: number) => {
  try {
    const { error } = await supabase.rpc('update_inventory_quantity', {
      item_id: itemId,
      quantity_change: quantityChange
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};