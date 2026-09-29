import { ApiKey, ApiKeyScope } from '../types';
import { supabase } from '../lib/supabase';

async function apiRequest(path: string, init: RequestInit): Promise<{ data?: ApiKey; secret?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase authentication is required.' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: 'Please sign in again.' };
  const response = await fetch(path, { ...init, headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json', ...(init.headers || {}) } });
  const body = await response.json() as { data?: ApiKey; secret?: string; error?: { message?: string } | string };
  if (!response.ok) return { error: typeof body.error === 'string' ? body.error : body.error?.message || 'API key operation failed.' };
  return { data: body.data, secret: body.secret };
}

export function createManagedApiKey(input: { name: string; scopes: ApiKeyScope[]; allowedProfileIds: string[] | null; expiresAt?: string }) {
  return apiRequest('/api/api-keys', { method: 'POST', body: JSON.stringify(input) });
}

export function rotateManagedApiKey(keyId: string) {
  return apiRequest(`/api/api-keys/${encodeURIComponent(keyId)}/rotate`, { method: 'POST' });
}

export function revokeManagedApiKey(keyId: string) {
  return apiRequest(`/api/api-keys/${encodeURIComponent(keyId)}`, { method: 'DELETE' });
}
