import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export const getUser = cache(async (supabase: SupabaseClient<any, any, any>) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getProducts = cache(async (supabase: SupabaseClient<any, any, any>) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

export const getUserDetails = cache(async (supabase: SupabaseClient<any, any, any>) => {
  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();
  return userDetails;
});
