import { supabase } from '../lib/supabase';

export interface AgencyProfileAnalytics {
  profileId: string;
  username: string;
  displayName: string;
  status: string;
  pageViews: number;
  uniqueVisitors: number;
  clicks: number;
  ctr: number;
  orderCount: number;
  salesCents: number;
}

export interface AgencyAnalyticsSnapshot {
  period: string;
  totals: Omit<AgencyProfileAnalytics, 'profileId' | 'username' | 'displayName' | 'status'>;
  profiles: AgencyProfileAnalytics[];
  generatedAt: string;
}

export async function loadAgencyAnalytics(days = 30): Promise<AgencyAnalyticsSnapshot> {
  if (!supabase) throw new Error('Portfolio analytics requires a signed-in workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to view portfolio analytics.');
  const response = await fetch(`/api/analytics/agency?days=${encodeURIComponent(days)}`, {
    headers: { authorization: `Bearer ${session.access_token}` },
  });
  const body = await response.json() as { data?: AgencyAnalyticsSnapshot; error?: string | { message?: string } };
  if (!response.ok || !body.data) {
    throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to load portfolio analytics.');
  }
  return body.data;
}
