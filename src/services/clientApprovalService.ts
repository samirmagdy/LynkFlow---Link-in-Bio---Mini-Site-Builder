import { supabase } from '../lib/supabase';

export interface ClientApprovalRequest {
  id: string;
  profileId: string;
  username: string;
  clientName: string;
  clientEmail: string;
  status: 'pending';
  expiresAt: string;
  approvalUrl: string;
}

export async function createClientApprovalRequest(profileId: string, clientName: string, clientEmail: string, ttlDays = 7): Promise<ClientApprovalRequest> {
  if (!supabase) throw new Error('Supabase authentication is required for client approval links.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before requesting client approval.');
  const response = await fetch('/api/profile/client-approval', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId, clientName, clientEmail, ttlDays }),
  });
  const body = await response.json().catch(() => ({})) as { data?: ClientApprovalRequest; error?: string | { message?: string } };
  if (!response.ok || !body.data) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Client approval link could not be created.');
  }
  return body.data;
}
