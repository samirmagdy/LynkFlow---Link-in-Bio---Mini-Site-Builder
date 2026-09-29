import { CustomDomainConfig } from '../types';
import { supabase } from '../lib/supabase';

async function request(path: string, body: Record<string, unknown>): Promise<{ success?: boolean; config?: CustomDomainConfig; error?: string }> {
  if (!supabase) return { error: 'Supabase authentication is required.' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: 'Please sign in again.' };
  const response = await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json() as { success?: boolean; config?: CustomDomainConfig; error?: { message?: string } | string };
  if (!response.ok) return { error: typeof payload.error === 'string' ? payload.error : payload.error?.message || 'Domain operation failed.' };
  return { success: payload.success, config: payload.config };
}

export function verifyManagedDomain(profileId: string, domain: string) {
  return request('/api/domains/verify', { profileId, domain });
}

export function recheckManagedDomain(profileId: string, domain: string) {
  return request('/api/domains/recheck', { profileId, domain });
}

export function removeManagedDomain(profileId: string) {
  return request('/api/domains/remove', { profileId });
}
