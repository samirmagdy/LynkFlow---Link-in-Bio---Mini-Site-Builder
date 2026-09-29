import { BillingCycle, PlanType } from '../types';
import { supabase } from '../lib/supabase';

export async function createStripeCheckoutSession(planId: PlanType, billingCycle: BillingCycle): Promise<string> {
  if (!supabase) throw new Error('Supabase authentication is required for billing.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before upgrading your plan.');

  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ planId, billingCycle }),
  });
  const body = await response.json() as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || 'Unable to start Stripe Checkout.');
  return body.url;
}

export async function cancelStripeSubscription(): Promise<void> {
  if (!supabase) throw new Error('Supabase authentication is required for billing.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before managing billing.');
  const response = await fetch('/api/stripe/cancel', {
    method: 'POST', headers: { authorization: `Bearer ${session.access_token}` }
  });
  const body = await response.json() as { error?: string };
  if (!response.ok) throw new Error(body.error || 'Unable to cancel subscription.');
}
