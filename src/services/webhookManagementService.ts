import { WebhookEventTopic, WebhookSubscription } from '../types';
import { supabase } from '../lib/supabase';

type ApiResult = {
  data?: WebhookSubscription;
  secret?: string;
  error?: string;
  success?: boolean;
  delivered?: boolean;
  deliveryId?: string;
};

async function request(path: string, init: RequestInit): Promise<ApiResult> {
  if (!supabase) return { error: 'Supabase authentication is required.' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: 'Please sign in again.' };
  const response = await fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
      ...(init.headers || {})
    }
  });
  const body = await response.json() as {
    data?: WebhookSubscription & { delivered?: boolean; deliveryId?: string };
    secret?: string;
    success?: boolean;
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    return { error: typeof body.error === 'string' ? body.error : body.error?.message || 'Webhook operation failed.' };
  }
  return {
    data: body.data,
    secret: body.secret,
    success: body.success,
    delivered: body.data?.delivered,
    deliveryId: body.data?.deliveryId
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export function createManagedWebhook(input: { url: string; topics: WebhookEventTopic[]; description?: string }) {
  return request('/api/webhooks', { method: 'POST', body: JSON.stringify(input) });
}

export function updateManagedWebhook(hookId: string, status: 'active' | 'paused') {
  return request(`/api/webhooks/${encodeURIComponent(hookId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function deleteManagedWebhook(hookId: string) {
  return request(`/api/webhooks/${encodeURIComponent(hookId)}`, { method: 'DELETE' });
}

export function testManagedWebhook(hookId: string) {
  return request(`/api/webhooks/${encodeURIComponent(hookId)}/test`, {
    method: 'POST',
    body: '{}'
  });
}
