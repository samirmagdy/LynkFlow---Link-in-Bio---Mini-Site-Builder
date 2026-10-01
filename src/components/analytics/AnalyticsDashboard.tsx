import React, { lazy, Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  MousePointerClick, 
  Percent, 
  Download, 
  Globe, 
  Smartphone, 
  ExternalLink,
  Sparkles,
  QrCode
} from 'lucide-react';
import { animateCounter, animateBarFill } from '../../utils/animeAnimations';
import { animate, stagger } from 'animejs';
import { analyticsEngineService, AnalyticsAggregateSummary } from '../../services/analyticsEngineService';

const ProfileAnalyticsDashboard = lazy(() => import('./ProfileAnalyticsDashboard').then(module => ({ default: module.ProfileAnalyticsDashboard })));

export const AnalyticsDashboard: React.FC = () => {
  const { activeProfile, analytics, user, showToast, appendAuditLog } = useApp();
  const [analyticsEngine, setAnalyticsEngine] = useState<'recharts' | 'anime'>('recharts');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  const pageViewsRef = useRef<HTMLDivElement>(null);
  const visitorsRef = useRef<HTMLDivElement>(null);
  const clicksRef = useRef<HTMLDivElement>(null);
  const ctrRef = useRef<HTMLDivElement>(null);
  const chartBarsRef = useRef<HTMLDivElement>(null);
  const progressBarsRef = useRef<HTMLDivElement>(null);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const allKnownBlocks = useMemo(() => {
    return activeProfile.tabs.flatMap(t => t.blocks).map(b => ({
      id: b.id,
      title: b.title || 'Untitled Block',
      type: b.type
    }));
  }, [activeProfile]);

  // Authoritative Aggregate Summary from Engine (AN-001, AN-002, AN-003)
  const summary: AnalyticsAggregateSummary = useMemo(() => {
    return analyticsEngineService.aggregateProfileAnalytics(
      activeProfile.id,
      timeRange,
      timezone,
      allKnownBlocks,
      analytics
    );
  }, [activeProfile.id, timeRange, timezone, allKnownBlocks, analytics]);

  const pageViews = summary.totalPageViews;
  const linkClicks = summary.totalClicks;
  const qrScans = summary.totalQrScans;
  const uniqueVisitors = summary.uniqueVisitors;
  const ctr = summary.overallCtr.toFixed(1);

  // Velocity activity from reconciled time series
  const dailyActivity = useMemo(() => {
    return summary.timeSeries.slice(-7).map(b => ({
      day: b.dateLabel,
      views: b.views,
      clicks: b.clicks
    }));
  }, [summary.timeSeries]);

  const maxDailyViews = Math.max(...dailyActivity.map(d => d.views), 1);

  // Top blocks
  const blockPerformance = useMemo(() => {
    return summary.blocks.slice(0, 6).map(b => ({
      id: b.blockId,
      title: b.blockTitle,
      type: b.blockType,
      clicks: b.clicks,
      blockCtr: b.ctr.toFixed(1),
      historicalOnly: b.historicalOnly
    }));
  }, [summary.blocks]);

  // Run Anime.js counter animations and chart springs
  useEffect(() => {
    animateCounter(pageViewsRef.current, 0, pageViews, { duration: 900 });
    animateCounter(visitorsRef.current, 0, uniqueVisitors, { duration: 900 });
    animateCounter(clicksRef.current, 0, linkClicks, { duration: 900 });
    animateCounter(ctrRef.current, 0, parseFloat(ctr) || 0, { duration: 900, decimals: 1, suffix: '%' });

    if (chartBarsRef.current) {
      const bars = chartBarsRef.current.querySelectorAll<HTMLElement>('.anime-chart-bar');
      if (bars.length > 0) {
        animate(Array.from(bars), {
          scaleY: [0, 1],
          transformOrigin: ['50% 100%', '50% 100%'],
          delay: stagger(60, { start: 50 }),
          duration: 850,
          ease: 'outElastic(1, .6)'
        });
      }
    }

    if (progressBarsRef.current) {
      const pBars = progressBarsRef.current.querySelectorAll<HTMLElement>('.anime-progress-bar');
      if (pBars.length > 0) {
        animateBarFill(pBars);
      }
    }
  }, [timeRange, pageViews, linkClicks]);

  // Bounded CSV Export with Audit Logging (AN-004)
  const handleExportCSV = () => {
    try {
      const { csvContent, exportId, rowCount } = analyticsEngineService.generateBoundedExportCsv(
        activeProfile.id,
        activeProfile.username,
        timeRange,
        user.email,
        analytics
      );
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lynkflow_analytics_${activeProfile.username}_${timeRange}_${exportId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      appendAuditLog('analytics_exported', `@${activeProfile.username}`, `Exported ${rowCount} analytics events (range: ${timeRange}, export: ${exportId})`);
      showToast(`Exported ${rowCount.toLocaleString()} events with audit ID ${exportId}`);
    } catch {
      showToast('Export failed. Please check permissions.');
    }
  };

  return (
    <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" />
            <span>Traffic & Conversion Analytics</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Privacy-first real-time telemetry for @{activeProfile.username}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Engine Selector: Recharts vs Anime.js */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-line text-xs">
            <button
              onClick={() => setAnalyticsEngine('recharts')}
              aria-pressed={analyticsEngine === 'recharts'}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                analyticsEngine === 'recharts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Recharts Dashboard</span>
            </button>
            <button
              onClick={() => setAnalyticsEngine('anime')}
              aria-pressed={analyticsEngine === 'anime'}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                analyticsEngine === 'anime'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              <span>Anime.js Velocity</span>
            </button>
          </div>

          {analyticsEngine === 'anime' && (
            <>
              {/* Time range buttons */}
              <div className="flex items-center bg-surface p-1 rounded-xl border border-line text-xs">
                {(['today', '7d', '30d', 'all'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    aria-pressed={timeRange === range}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize cursor-pointer ${
                      timeRange === range ? 'bg-surface-2 text-ink shadow-xs' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {analyticsEngine === 'recharts' ? (
        <Suspense fallback={<div className="min-h-96 rounded-2xl border border-line bg-surface/60 flex items-center justify-center text-xs text-subtle">Loading profile analytics…</div>}>
          <ProfileAnalyticsDashboard />
        </Suspense>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-line">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Page Views</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div ref={pageViewsRef} className="text-2xl font-bold text-ink font-mono tabular-nums">{pageViews.toLocaleString()}</div>
          <div className="text-[11px] text-success mt-1 flex items-center gap-1">
            <span>↑ 14.2%</span>
            <span className="text-subtle">vs prev period</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Unique Visitors</span>
            <Users className="w-4 h-4 text-success" />
          </div>
          <div ref={visitorsRef} className="text-2xl font-bold text-ink font-mono tabular-nums">{uniqueVisitors.toLocaleString()}</div>
          <div className="text-[11px] text-success mt-1 flex items-center gap-1">
            <span>↑ 8.6%</span>
            <span className="text-subtle">organic reach</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Link & Action Clicks</span>
            <MousePointerClick className="w-4 h-4 text-info" />
          </div>
          <div ref={clicksRef} className="text-2xl font-bold text-ink font-mono tabular-nums">{linkClicks.toLocaleString()}</div>
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-subtle" />
            <span>{qrScans} QR scans included</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Average CTR</span>
            <Percent className="w-4 h-4 text-warning" />
          </div>
          <div ref={ctrRef} className="text-2xl font-bold text-ink font-mono tabular-nums">{ctr}%</div>
          <div className="text-[11px] text-muted mt-1">
            Authoritative aggregate rate
          </div>
        </div>
      </div>

      {/* 7-Day Velocity Chart (Animated with Anime.js) */}
      <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              7-Day Conversion Velocity (Anime.js Elastic Timeline)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span> Clicks
            </span>
          </div>
        </div>

        <div ref={chartBarsRef} className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-line">
          {dailyActivity.map((day) => {
            const viewsHeight = Math.max(15, Math.round((day.views / maxDailyViews) * 100));
            const clicksHeight = Math.max(8, Math.round((day.clicks / maxDailyViews) * 100));
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  <div
                    className="anime-chart-bar w-3.5 sm:w-5 bg-indigo-500 hover:bg-indigo-400 rounded-t-md transition-colors cursor-pointer relative"
                    style={{ height: `${viewsHeight}%` }}
                    title={`${day.day}: ${day.views} views`}
                    role="img"
                    aria-label={`${day.day}: ${day.views} views`}
                  />
                  <div
                    className="anime-chart-bar w-3.5 sm:w-5 bg-emerald-400 hover:bg-emerald-300 rounded-t-md transition-colors cursor-pointer relative"
                    style={{ height: `${clicksHeight}%` }}
                    title={`${day.day}: ${day.clicks} clicks`}
                    role="img"
                    aria-label={`${day.day}: ${day.clicks} clicks`}
                  />
                </div>
                <span className="text-[11px] font-mono text-muted group-hover:text-ink transition-colors">
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Links Table */}
      <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
          Top Performing Blocks & Content
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-2.5 font-medium">Content Block</th>
                <th className="pb-2.5 font-medium">Type</th>
                <th className="pb-2.5 font-medium text-right">Clicks</th>
                <th className="pb-2.5 font-medium text-right">Click Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {blockPerformance.map((block) => (
                <tr key={block.id} className="hover:bg-surface-2/30 transition-colors">
                  <td className="py-2.5 font-medium text-ink max-w-xs truncate">{block.title}</td>
                  <td className="py-2.5 text-muted capitalize">{block.type}</td>
                  <td className="py-2.5 text-right font-mono text-ink tabular-nums">{block.clicks}</td>
                  <td className="py-2.5 text-right font-mono text-success tabular-nums">{block.blockCtr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referrers & Geographic Distribution 2-Column Grid */}
      <div ref={progressBarsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Referrers */}
        <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            Traffic Sources / Referrers
          </h4>
          <div className="space-y-2.5">
            {summary.referrers.map((ref) => (
              <div key={ref.source}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-body font-medium">{ref.source}</span>
                  <span className="font-mono text-muted">{ref.views} ({ref.percentage}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="anime-progress-bar h-full bg-indigo-500 rounded-full" style={{ width: `${ref.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            Device Distribution
          </h4>
          <div className="space-y-3">
            {summary.devices.map((dev) => (
              <div key={dev.device}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-body flex items-center gap-1.5 capitalize">
                    {dev.device === 'mobile' ? (
                      <Smartphone className="w-3.5 h-3.5 text-accent" />
                    ) : dev.device === 'desktop' ? (
                      <ExternalLink className="w-3.5 h-3.5 text-info" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-warning" />
                    )}
                    <span>{dev.device}</span>
                  </span>
                  <span className="font-mono text-muted">{dev.percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div 
                    className="anime-progress-bar h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${dev.percentage}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Countries (AN-003 with withheld values) */}
        <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            Top Geographic Markets
          </h4>
          <div className="space-y-2.5">
            {summary.countries.map((c) => (
              <div key={c.country} className="flex items-center justify-between text-xs py-1 border-b border-line/40 last:border-0">
                <span className={`text-body ${c.isWithheld ? 'italic text-subtle' : ''}`}>
                  {c.country}
                </span>
                <span className="font-mono text-muted">{c.views} visits</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
