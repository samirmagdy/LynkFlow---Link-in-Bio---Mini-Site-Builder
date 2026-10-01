import { supabase } from '../lib/supabase';

export type ShareProvider = 'x' | 'linkedin' | 'facebook' | 'whatsapp' | 'telegram' | 'email';

export interface SocialShareEvent {
  id: string;
  profile_id: string;
  provider: ShareProvider;
  content: string;
  target_url: string;
  status: 'initiated' | 'completed' | 'failed';
  created_at: string;
}

async function authorizedRequest(path: string, init?: RequestInit): Promise<Response> {
  if (!supabase) throw new Error('Sharing requires a signed-in workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to use sharing.');
  return fetch(path, { ...init, headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json', ...(init?.headers || {}) } });
}

export async function loadSocialShareEvents(profileId: string): Promise<SocialShareEvent[]> {
  const response = await authorizedRequest(`/api/social/shares?profileId=${encodeURIComponent(profileId)}`);
  const body = await response.json() as { data?: SocialShareEvent[]; error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load share history.');
  return Array.isArray(body.data) ? body.data : [];
}

export async function recordSocialShare(profileId: string, provider: ShareProvider, content: string, targetUrl: string): Promise<SocialShareEvent> {
  const response = await authorizedRequest('/api/social/shares', { method: 'POST', body: JSON.stringify({ profileId, provider, content, targetUrl }) });
  const body = await response.json() as { data?: SocialShareEvent; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to record share.');
  return body.data;
}
