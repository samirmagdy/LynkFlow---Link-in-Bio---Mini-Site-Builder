import { supabase } from '../lib/supabase';

export type ShareProvider = 'x' | 'linkedin' | 'facebook' | 'whatsapp' | 'telegram' | 'email' | 'tiktok' | 'instagram' | 'youtube' | 'threads';

export interface SocialShareEvent {
  id: string;
  profile_id: string;
  provider: ShareProvider;
  content: string;
  target_url: string;
  status: 'initiated' | 'completed' | 'failed';
  created_at: string;
}

export interface SocialConnection {
  id: string;
  provider: 'linkedin' | 'tiktok' | 'instagram';
  provider_account_id: string;
  account_name: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface SocialPublication {
  id: string;
  profile_id: string;
  provider: 'linkedin' | 'tiktok' | 'instagram';
  content: string;
  target_url: string | null;
  media_url: string | null;
  media_type?: 'image' | 'video';
  scheduled_at: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  provider_post_id: string | null;
  last_error: string | null;
  attempt_count: number;
  share_event_id: string | null;
  created_at: string;
  updated_at: string;
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

export async function completeSocialShare(id: string, status: 'completed' | 'failed'): Promise<void> {
  const response = await authorizedRequest(`/api/social/shares/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  if (!response.ok) {
    const body = await response.json() as { error?: string | { message?: string } };
    throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to update share status.');
  }
}

export async function loadSocialConnections(): Promise<SocialConnection[]> {
  const response = await authorizedRequest('/api/social/connections');
  const body = await response.json() as { data?: SocialConnection[]; error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load social connections.');
  return Array.isArray(body.data) ? body.data : [];
}

export function startLinkedInOAuth(): void {
  window.location.assign('/api/social/linkedin/start');
}

export function startTikTokOAuth(): void {
  window.location.assign('/api/social/tiktok/start');
}

export function startInstagramOAuth(): void {
  window.location.assign('/api/social/instagram/start');
}

export async function publishInstagramPost(content: string, mediaUrl: string, mediaType: 'image' | 'video', profileId: string, shareEventId?: string): Promise<{ providerPostId: string | null }> {
  const response = await authorizedRequest('/api/social/instagram/post', { method: 'POST', body: JSON.stringify({ content, mediaUrl, mediaType, profileId, shareEventId }) });
  const body = await response.json() as { data?: { providerPostId?: string | null }; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to publish to Instagram.');
  return { providerPostId: body.data.providerPostId || null };
}

export async function scheduleInstagramPost(content: string, mediaUrl: string, mediaType: 'image' | 'video', profileId: string, scheduledAt: string): Promise<SocialPublication> {
  const response = await authorizedRequest('/api/social/instagram/schedule', { method: 'POST', body: JSON.stringify({ content, mediaUrl, mediaType, profileId, scheduledAt }) });
  const body = await response.json() as { data?: SocialPublication; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to schedule Instagram post.');
  return body.data;
}

export async function publishLinkedInPost(content: string, targetUrl: string, profileId: string): Promise<{ providerPostId: string | null }> {
  const response = await authorizedRequest('/api/social/linkedin/post', { method: 'POST', body: JSON.stringify({ content, targetUrl, profileId }) });
  const body = await response.json() as { data?: { providerPostId?: string | null }; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to publish to LinkedIn.');
  return { providerPostId: body.data.providerPostId || null };
}

export async function publishTikTokPost(content: string, mediaUrl: string, profileId: string, shareEventId?: string): Promise<{ providerPostId: string | null; status: 'processing' }> {
  const response = await authorizedRequest('/api/social/tiktok/post', { method: 'POST', body: JSON.stringify({ content, mediaUrl, profileId, shareEventId }) });
  const body = await response.json() as { data?: { providerPostId?: string | null; status?: 'processing' }; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to publish to TikTok.');
  return { providerPostId: body.data.providerPostId || null, status: 'processing' };
}

export async function scheduleLinkedInPost(content: string, targetUrl: string, profileId: string, scheduledAt: string): Promise<SocialPublication> {
  const response = await authorizedRequest('/api/social/linkedin/schedule', { method: 'POST', body: JSON.stringify({ content, targetUrl, profileId, scheduledAt }) });
  const body = await response.json() as { data?: SocialPublication; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to schedule LinkedIn post.');
  return body.data;
}

export async function scheduleTikTokPost(content: string, mediaUrl: string, profileId: string, scheduledAt: string): Promise<SocialPublication> {
  const response = await authorizedRequest('/api/social/tiktok/schedule', { method: 'POST', body: JSON.stringify({ content, mediaUrl, profileId, scheduledAt }) });
  const body = await response.json() as { data?: SocialPublication; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to schedule TikTok post.');
  return body.data;
}

export async function loadSocialPublications(profileId: string): Promise<SocialPublication[]> {
  const response = await authorizedRequest(`/api/social/publications?profileId=${encodeURIComponent(profileId)}`);
  const body = await response.json() as { data?: SocialPublication[]; error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load scheduled posts.');
  return Array.isArray(body.data) ? body.data : [];
}

export async function cancelSocialPublication(id: string): Promise<void> {
  const response = await authorizedRequest(`/api/social/publications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    const body = await response.json() as { error?: string | { message?: string } };
    throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to cancel scheduled post.');
  }
}
