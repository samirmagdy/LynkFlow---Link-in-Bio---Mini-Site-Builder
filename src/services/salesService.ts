import { supabase } from '../lib/supabase';

export interface ProductOrder {
  id: string;
  profile_id: string;
  block_id: string;
  stripe_session_id: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number;
  currency: string;
  customer_email?: string | null;
  customer_name?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export async function loadProductOrders(profileId?: string): Promise<ProductOrder[]> {
  if (!supabase) throw new Error('Sales data requires a signed-in Supabase workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to view sales.');
  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
  const response = await fetch(`/api/sales/orders${query}`, { headers: { authorization: `Bearer ${session.access_token}` } });
  const body = await response.json() as { data?: ProductOrder[]; error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load sales data.');
  return Array.isArray(body.data) ? body.data : [];
}
