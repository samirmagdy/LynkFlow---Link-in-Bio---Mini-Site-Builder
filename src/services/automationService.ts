import { supabase } from '../lib/supabase';

export interface EmailAutomation {
  id: string;
  profile_id: string;
  name: string;
  trigger: 'subscriber.created';
  subject: string;
  body: string;
  enabled: boolean;
  run_count: number;
  last_triggered_at?: string | null;
  created_by: string;
  created_at: string;
}

export interface SocialAutomation {
  id: string;
  profile_id: string;
  provider: 'instagram';
  provider_account_id: string;
  trigger: 'comment.keyword' | 'message.keyword';
  keyword: string;
  response_text: string;
  target_url: string | null;
  enabled: boolean;
  run_count: number;
  last_triggered_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!supabase) throw new Error('Automations require a signed-in Supabase workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to manage automations.');
  return fetch(path, { ...init, headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json', ...(init?.headers || {}) } });
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
  const message = typeof body.error === 'string' ? body.error : body.error?.message;
  return new Error(message || fallback);
}

export async function loadEmailAutomations(profileId: string): Promise<EmailAutomation[]> {
  const response = await request(`/api/automations?profileId=${encodeURIComponent(profileId)}`);
  if (!response.ok) throw await failure(response, 'Unable to load automations.');
  const body = await response.json() as { data?: EmailAutomation[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function createEmailAutomation(profileId: string, name: string, subject: string, body: string): Promise<EmailAutomation> {
  const response = await request('/api/automations', { method: 'POST', body: JSON.stringify({ profileId, name, subject, body }) });
  if (!response.ok) throw await failure(response, 'Unable to save automation.');
  const payload = await response.json() as { data?: EmailAutomation };
  if (!payload.data) throw new Error('Automation was saved without a server result.');
  return payload.data;
}

export async function setEmailAutomationEnabled(id: string, enabled: boolean): Promise<void> {
  const response = await request(`/api/automations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
  if (!response.ok) throw await failure(response, 'Unable to update automation.');
}

export async function deleteEmailAutomation(id: string): Promise<void> {
  const response = await request(`/api/automations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw await failure(response, 'Unable to delete automation.');
}

export async function loadSocialAutomations(profileId: string): Promise<SocialAutomation[]> {
  const response = await request(`/api/social-automations?profileId=${encodeURIComponent(profileId)}`);
  if (!response.ok) throw await failure(response, 'Unable to load Instagram automations.');
  const body = await response.json() as { data?: SocialAutomation[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function createSocialAutomation(profileId: string, trigger: SocialAutomation['trigger'], keyword: string, responseText: string, targetUrl: string): Promise<SocialAutomation> {
  const response = await request('/api/social-automations', { method: 'POST', body: JSON.stringify({ profileId, trigger, keyword, responseText, targetUrl }) });
  if (!response.ok) throw await failure(response, 'Unable to save Instagram automation.');
  const payload = await response.json() as { data?: SocialAutomation };
  if (!payload.data) throw new Error('Instagram automation was saved without a server result.');
  return payload.data;
}

export async function setSocialAutomationEnabled(id: string, enabled: boolean): Promise<void> {
  const response = await request(`/api/social-automations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
  if (!response.ok) throw await failure(response, 'Unable to update Instagram automation.');
}

export async function deleteSocialAutomation(id: string): Promise<void> {
  const response = await request(`/api/social-automations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw await failure(response, 'Unable to delete Instagram automation.');
}
