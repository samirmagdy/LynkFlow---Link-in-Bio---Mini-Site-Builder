import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, MousePointerClick, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AgencyAnalyticsSnapshot, loadAgencyAnalytics } from '../../services/agencyAnalyticsService';

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail?: string }) {
  return <div className="rounded-2xl border border-line bg-canvas/70 p-4">
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-subtle"><Icon className="h-3.5 w-3.5 text-accent" />{label}</div>
    <div className="mt-2 text-xl font-bold tracking-tight text-ink">{value}</div>
    {detail && <div className="mt-1 text-[11px] text-muted">{detail}</div>}
  </div>;
}

export const AgencyAnalyticsPanel: React.FC = () => {
  const { workspace } = useApp();
  const [days, setDays] = useState(30);
  const [snapshot, setSnapshot] = useState<AgencyAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setSnapshot(await loadAgencyAnalytics(days)); }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Unable to load portfolio analytics.'; setError(message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (workspace.plan === 'agency') void load(); }, [days, workspace.plan]);
  const maxViews = useMemo(() => Math.max(...(snapshot?.profiles || []).map(profile => profile.pageViews), 1), [snapshot]);

  if (workspace.plan !== 'agency') return null;
  return <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-5" aria-labelledby="portfolio-analytics-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-accent" /><h3 id="portfolio-analytics-title" className="text-sm font-bold text-ink">Portfolio performance</h3></div>
        <p className="mt-1 text-xs text-muted">Compare every managed profile in one privacy-first view.</p>
      </div>
      <div className="flex items-center gap-2">
        <select value={days} onChange={event => setDays(Number(event.target.value))} className="rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink" aria-label="Analytics period">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-body hover:bg-surface-2 disabled:opacity-50" aria-label="Refresh portfolio analytics">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
    </div>
    {error && <div className="rounded-xl border border-warning/30 bg-warning-surface px-3 py-2 text-xs text-warning">{error} <button type="button" onClick={() => void load()} className="ml-1 font-semibold underline">Try again</button></div>}
    {loading && !snapshot && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-surface-2" />)}</div>}
    {snapshot && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Eye} label="Page views" value={snapshot.totals.pageViews.toLocaleString()} detail={snapshot.period} />
        <Metric icon={Users} label="Visitors" value={snapshot.totals.uniqueVisitors.toLocaleString()} detail="Daily privacy-safe uniques" />
        <Metric icon={MousePointerClick} label="CTR" value={`${snapshot.totals.ctr}%`} detail={`${snapshot.totals.clicks.toLocaleString()} clicks`} />
        <Metric icon={ShoppingBag} label="Sales" value={`${(snapshot.totals.salesCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`} detail={`${snapshot.totals.orderCount} paid orders`} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[680px] text-left text-xs"><caption className="sr-only">Profile performance leaderboard</caption><thead className="bg-surface-2 text-[10px] uppercase tracking-wide text-subtle"><tr><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Visitors</th><th className="px-4 py-3">Clicks</th><th className="px-4 py-3">CTR</th><th className="px-4 py-3">Sales</th></tr></thead>
          <tbody className="divide-y divide-line">{snapshot.profiles.map(profile => <tr key={profile.profileId} className="text-body"><td className="px-4 py-3"><div className="font-semibold text-ink">{profile.displayName}</div><div className="text-[11px] text-subtle">@{profile.username}</div><div className="mt-2 h-1.5 max-w-40 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max((profile.pageViews / maxViews) * 100, profile.pageViews ? 3 : 0)}%` }} /></div></td><td className="px-4 py-3 font-medium">{profile.pageViews.toLocaleString()}</td><td className="px-4 py-3">{profile.uniqueVisitors.toLocaleString()}</td><td className="px-4 py-3">{profile.clicks.toLocaleString()}</td><td className="px-4 py-3">{profile.ctr}%</td><td className="px-4 py-3">{(profile.salesCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</td></tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
};
