import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { loadSocialAnalytics, SocialAnalyticsSummary } from '../../services/socialAnalyticsService';

type Period = 'today' | '7d' | '30d' | '90d' | 'all';

export const SocialPerformanceCard: React.FC<{ profileId: string; period: Period }> = ({ profileId, period }) => {
  const [summary, setSummary] = useState<SocialAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    void loadSocialAnalytics(profileId, period).then(value => { if (!cancelled) setSummary(value); }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load social analytics.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId, period]);

  return <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" /><h4 className="text-sm font-bold text-ink">Social publishing performance</h4></div><p className="mt-1 text-xs text-muted">Publishing outcomes recorded by LynkFlow for the selected period. Provider reach and impressions are not fabricated.</p></div><span className="rounded-full bg-accent-surface px-2.5 py-1 text-[11px] font-semibold text-accent">{period}</span></div>{error ? <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger-surface px-3 py-2.5 text-xs text-danger">{error}</div> : loading ? <div className="flex items-center gap-2 p-8 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading publishing metrics…</div> : <><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Handoffs" value={summary?.totalHandoffs || 0} icon={<Send className="h-3.5 w-3.5" />} /><Metric label="Completed" value={summary?.completedHandoffs || 0} icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />} /><Metric label="Failed" value={summary?.failedHandoffs || 0} icon={<XCircle className="h-3.5 w-3.5 text-danger" />} /><Metric label="Success rate" value={`${summary?.successRate || 0}%`} icon={<BarChart3 className="h-3.5 w-3.5 text-accent" />} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-line text-[10px] uppercase tracking-wide text-subtle"><tr><th className="pb-2 font-semibold">Provider</th><th className="pb-2 font-semibold">Handoffs</th><th className="pb-2 font-semibold">Completed</th><th className="pb-2 font-semibold">Failed</th><th className="pb-2 font-semibold">Scheduled</th><th className="pb-2 font-semibold">Published</th></tr></thead><tbody className="divide-y divide-line">{summary?.providers.length ? summary.providers.map(metric => <tr key={metric.provider}><td className="py-2.5 font-semibold capitalize text-ink">{metric.provider}</td><td className="py-2.5 text-body">{metric.handoffs}</td><td className="py-2.5 text-success">{metric.completed}</td><td className="py-2.5 text-danger">{metric.failed}</td><td className="py-2.5 text-warning">{metric.scheduled}</td><td className="py-2.5 text-accent">{metric.published}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-muted">No publishing activity in this period.</td></tr>}</tbody></table></div></>}</section>;
};

const Metric: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded-xl border border-line bg-canvas p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted">{icon}{label}</div><div className="mt-1.5 text-xl font-bold tabular-nums text-ink">{value}</div></div>;
