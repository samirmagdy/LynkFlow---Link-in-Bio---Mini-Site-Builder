import { supabase } from '../lib/supabase';

export type EmailCampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';

export interface EmailCampaign {
  id: string;
  profile_id: string;
  subject: string;
  body: string;
  status: EmailCampaignStatus;
  recipient_count: number;
  sent_count: number;
  created_by: string;
  created_at: string;
  sent_at?: string | null;
}

async function authenticatedRequest(path: string, init?: RequestInit): Promise<Response> {
  if (!supabase) throw new Error('Campaigns require a signed-in Supabase workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to manage campaigns.');
  return fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
  const message = typeof body.error === 'string' ? body.error : body.error?.message;
  return new Error(message || fallback);
}

export async function loadEmailCampaigns(profileId: string): Promise<EmailCampaign[]> {
  const response = await authenticatedRequest(`/api/campaigns?profileId=${encodeURIComponent(profileId)}`);
  if (!response.ok) throw await readError(response, 'Unable to load campaigns.');
  const body = await response.json() as { data?: EmailCampaign[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function createEmailCampaign(profileId: string, subject: string, body: string): Promise<EmailCampaign> {
  const response = await authenticatedRequest('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({ profileId, subject, body }),
  });
  if (!response.ok) throw await readError(response, 'Unable to save campaign.');
  const payload = await response.json() as { data?: EmailCampaign };
  if (!payload.data) throw new Error('Campaign was saved without a server result.');
  return payload.data;
}

export async function sendEmailCampaign(campaignId: string): Promise<{ id: string; recipientCount: number; sentCount: number; status: EmailCampaignStatus }> {
  const response = await authenticatedRequest(`/api/campaigns/${encodeURIComponent(campaignId)}/send`, { method: 'POST' });
  if (!response.ok) throw await readError(response, 'Unable to send campaign.');
  const payload = await response.json() as { data?: { id: string; recipientCount: number; sentCount: number; status: EmailCampaignStatus } };
  if (!payload.data) throw new Error('Campaign send completed without a server result.');
  return payload.data;
}
