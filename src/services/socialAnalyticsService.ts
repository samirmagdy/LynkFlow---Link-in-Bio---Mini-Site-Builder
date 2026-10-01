import { supabase } from '../lib/supabase';

export interface SocialProviderMetric {
  provider: string;
  handoffs: number;
  completed: number;
  failed: number;
  scheduled: number;
  published: number;
}

export interface SocialAnalyticsSummary {
  period: string;
  totalHandoffs: number;
  completedHandoffs: number;
  failedHandoffs: number;
  successRate: number;
  scheduled: number;
  published: number;
  providers: SocialProviderMetric[];
}

export async function loadSocialAnalytics(profileId: string, period: 'today' | '7d' | '30d' | '90d' | 'all'): Promise<SocialAnalyticsSummary> {
  if (!supabase) throw new Error('Social analytics requires a signed-in workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to view social analytics.');
  const response = await fetch(`/api/analytics/social?profileId=${encodeURIComponent(profileId)}&period=${encodeURIComponent(period)}`, { headers: { authorization: `Bearer ${session.access_token}` } });
  const body = await response.json() as { data?: SocialAnalyticsSummary; error?: string | { message?: string } };
  if (!response.ok || !body.data) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load social analytics.');
  return body.data;
}
