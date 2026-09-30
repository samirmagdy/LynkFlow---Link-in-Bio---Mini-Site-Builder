import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  Percent,
  Users,
  Layers,
  Compass,
  Smartphone,
  CheckCircle2,
  Download,
  ShieldCheck,
  Settings,
  QrCode
} from 'lucide-react';
import { analyticsEngineService, AnalyticsAggregateSummary } from '../../services/analyticsEngineService';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'all';
type ChartType = 'area' | 'bar' | 'line';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  unit?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/95 border border-line-strong backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[150px]">
        <div className="font-mono text-muted font-semibold border-b border-line pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-accent font-normal">Active Profile</span>
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-body">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-ink tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ProfileAnalyticsDashboard: React.FC = () => {
  const { activeProfile, analytics, profiles, switchActiveProfile, showToast, user, updateDraftProfile, appendAuditLog } = useApp();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  // Integrations form state
  const [metaPixelId, setMetaPixelId] = useState(activeProfile.trackingIntegrations?.metaPixelId || '');
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(activeProfile.trackingIntegrations?.googleAnalyticsId || '');
  const [tiktokPixelId, setTiktokPixelId] = useState(activeProfile.trackingIntegrations?.tiktokPixelId || '');

  useEffect(() => {
    setMetaPixelId(activeProfile.trackingIntegrations?.metaPixelId || '');
    setGoogleAnalyticsId(activeProfile.trackingIntegrations?.googleAnalyticsId || '');
    setTiktokPixelId(activeProfile.trackingIntegrations?.tiktokPixelId || '');
  }, [activeProfile.id, activeProfile.trackingIntegrations]);

  // Detect user's local timezone (AN-002)
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  // All blocks belonging to the active profile
  const activeBlocks = useMemo(() => {
    return activeProfile.tabs.flatMap(t => t.blocks);
  }, [activeProfile]);

  const allKnownBlocks = useMemo(() => {
    return activeBlocks.map(b => ({
      id: b.id,
      title: b.title || 'Untitled Block',
      type: b.type
    }));
  }, [activeBlocks]);

  // Authoritative aggregation summary derived strictly from raw events (AN-001, AN-002, AN-003)
  const aggregateSummary: AnalyticsAggregateSummary = useMemo(() => {
    return analyticsEngineService.aggregateProfileAnalytics(
      activeProfile.id,
      timeRange,
      timezone,
      allKnownBlocks,
      analytics
    );
  }, [activeProfile.id, timeRange, timezone, allKnownBlocks, analytics]);

  const timeSeriesData = useMemo(() => {
    return aggregateSummary.timeSeries.map(bucket => ({
      date: bucket.dateLabel,
      views: bucket.views,
      clicks: bucket.clicks,
      ctr: bucket.ctr,
      unique: bucket.visitors,
      qrScans: bucket.qrScans
    }));
  }, [aggregateSummary.timeSeries]);

  const totalViews = aggregateSummary.totalPageViews;
  const totalClicks = aggregateSummary.totalClicks;
  const totalUnique = aggregateSummary.uniqueVisitors;
  const aggregateCtr = aggregateSummary.overallCtr.toFixed(1);
  const totalQrScans = aggregateSummary.totalQrScans;

  // Block performance preserving historical deleted blocks (Edge Case 4)
  const blockPerformanceData = useMemo(() => {
    if (!aggregateSummary.blocks.length) {
      return [
        { id: 'fallback-1', name: 'No content clicks', fullTitle: 'Share your profile to start collecting metrics', type: 'link', clicks: 0, views: 0, ctr: 0, historicalOnly: false }
      ];
    }
    return aggregateSummary.blocks.slice(0, 8).map(b => ({
      id: b.blockId,
      name: b.blockTitle.length > 20 ? `${b.blockTitle.slice(0, 20)}…` : b.blockTitle,
      fullTitle: b.blockTitle,
      type: b.blockType,
      clicks: b.clicks,
      views: totalViews,
      ctr: b.ctr,
      historicalOnly: !!b.historicalOnly
    }));
  }, [aggregateSummary.blocks, totalViews]);

  // Real traffic channels for PieChart (AN-003)
  const referralSources = useMemo(() => {
    const palette = ['#e1306c', '#ef4444', '#38bdf8', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];
    if (!aggregateSummary.referrers.length) {
      return [{ name: 'Direct Traffic', value: 100, color: '#6366f1' }];
    }
    return aggregateSummary.referrers.map((ref, idx) => ({
      name: ref.source,
      value: ref.views,
      color: palette[idx % palette.length]
    }));
  }, [aggregateSummary.referrers]);

  // Real device breakdown (AN-003)
  const deviceBreakdown = useMemo(() => {
    const colors = {
      mobile: '#6366f1',
      desktop: '#10b981',
      tablet: '#f59e0b'
    };
    return aggregateSummary.devices.map(dev => ({
      name: dev.device.charAt(0).toUpperCase() + dev.device.slice(1),
      value: dev.views,
      color: colors[dev.device] || '#6366f1'
    }));
  }, [aggregateSummary.devices]);

  // Handle Bounded CSV Export with Operator Audit Log (AN-004)
  const handleExportCSV = () => {
    setIsExporting(true);
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
    } finally {
      setIsExporting(false);
    }
  };

  // Save Tracking Integrations (AN-005)
  const handleSaveIntegrations = () => {
    updateDraftProfile(prev => ({
      ...prev,
      trackingIntegrations: {
        metaPixelId: metaPixelId.trim() || undefined,
        googleAnalyticsId: googleAnalyticsId.trim() || undefined,
        tiktokPixelId: tiktokPixelId.trim() || undefined,
        consentRequired: true
      }
    }));
    setIsIntegrationsModalOpen(false);
    showToast('Tracking integrations saved. Scripts remain gated behind user consent.');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Profile Header & Switcher Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={activeProfile.avatarUrl}
            alt={activeProfile.displayName}
            width={48}
            height={48}
            decoding="async"
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink tracking-tight">
                {activeProfile.displayName}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-surface-2 text-[11px] font-mono text-body border border-line-strong">
                @{activeProfile.username}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Telemetry Active" />
            </div>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">
              {activeProfile.bio || 'Link-in-bio hub'} · {activeBlocks.length} Active Content Blocks
            </p>
          </div>
        </div>

        {/* Right side actions: Profile switcher, Integrations & Export button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time Telemetry Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-canvas border border-line text-[11px] font-mono text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-success font-semibold">Live Telemetry</span>
            <span className="text-subtle">·</span>
            <span>{aggregateSummary.ingestionLagMs}ms latency</span>
          </div>

          {/* Quick Profile Selector */}
          <div className="flex items-center gap-1.5 bg-canvas px-2.5 py-1.5 rounded-xl border border-line text-xs">
            <span className="text-[10px] uppercase font-mono text-subtle">Profile:</span>
            <select
              value={activeProfile.id}
              onChange={(e) => switchActiveProfile(e.target.value)}
              className="bg-transparent text-xs text-ink font-medium focus:outline-none cursor-pointer"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-surface text-ink">
                  @{p.username} ({p.displayName})
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Integrations (AN-005) */}
          <button
            onClick={() => setIsIntegrationsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-body hover:text-ink bg-canvas hover:bg-surface-3 border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Configure third-party tracking pixels (Meta, Google, TikTok)"
          >
            <Settings className="w-3.5 h-3.5 text-muted" />
            <span>Integrations</span>
            {(activeProfile.trackingIntegrations?.metaPixelId || activeProfile.trackingIntegrations?.googleAnalyticsId) && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            )}
          </button>

          {/* Permissioned Bounded CSV Export (AN-004) */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-2 text-ink-strong hover:text-ink border border-line-strong shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Export up to 5,000 raw events with audit log"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>{isExporting ? 'Exporting...' : 'Export Audit CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with Real Aggregated Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Views */}
        <div className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Page Views</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-accent">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink font-mono tabular-nums">
            {totalViews.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
            <span>{aggregateSummary.averageDailyViews.toLocaleString()}/day avg</span>
            <span className="text-subtle">· {timeRange}</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Link & Block Clicks</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-success">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink font-mono tabular-nums">
            {totalClicks.toLocaleString()}
          </div>
          <div className="text-[11px] text-success mt-1.5 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted">{totalQrScans} QR scans included</span>
          </div>
        </div>

        {/* Click-Through Rate (CTR) */}
        <div className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Click-Through Rate (CTR)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-warning">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink font-mono tabular-nums">
            {aggregateCtr}%
          </div>
          <div className="text-[11px] text-warning mt-1.5 flex items-center gap-1">
            <span>Authoritative aggregate</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-medium">Unique Visitors</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-info">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink font-mono tabular-nums">
            {totalUnique.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted mt-1.5">
            Cookieless daily hashed reach
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Chart: Views & Clicks Over Time */}
      <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h4 className="text-sm font-bold text-ink">
                View & Click-Through Velocity
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-accent-soft font-mono text-[10px] font-semibold">
                Recharts Engine
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Authoritative time-series for @{activeProfile.username} ({timezone})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-canvas p-1 rounded-xl border border-line text-xs">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  chartType === 'area' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  chartType === 'bar' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  chartType === 'line' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Line
              </button>
            </div>

            {/* Time Range Selector (AN-002) */}
            <div className="flex items-center bg-canvas p-1 rounded-xl border border-line text-xs">
              {(['today', '7d', '30d', '90d', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors uppercase cursor-pointer ${
                    timeRange === range ? 'bg-indigo-600 text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Area / Bar / Line Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--lf-line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <YAxis
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#viewsGradient)"
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#clicksGradient)"
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--lf-line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <YAxis
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="views" name="Views" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="clicks" name="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--lf-line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <YAxis
                  stroke="var(--lf-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column Grid: CTR Progression Trend & Block Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recharts CTR Trend Line Chart */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-warning" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                Click-Through Rate (CTR %) Trajectory
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted">
              Avg: <strong className="text-warning">{aggregateCtr}%</strong>
            </span>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--lf-line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--lf-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <YAxis
                  stroke="var(--lf-muted)"
                  fontSize={10}
                  tickLine={false}
                  unit="%"
                  axisLine={{ stroke: 'var(--lf-line)' }}
                />
                <Tooltip content={<CustomChartTooltip unit="%" />} />
                <ReferenceLine y={parseFloat(aggregateCtr)} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Mean', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey="ctr"
                  name="CTR"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#f59e0b' }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Block-by-Block Comparison Bar Chart */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-info" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                Clicks by Active Profile Block
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted">
              {blockPerformanceData.length} Blocks Monitored
            </span>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={blockPerformanceData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--lf-line)" horizontal={false} />
                <XAxis type="number" stroke="var(--lf-muted)" fontSize={10} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#a3a3a3"
                  fontSize={10}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="clicks" name="Clicks" fill="#06b6d4" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Referral Sources (PieChart) & Device Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Referral Channels Recharts Donut */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-success" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                Traffic Acquisition Channels
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted">Simulated Shares</span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomChartTooltip unit="%" />} />
                <Pie
                  data={referralSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {referralSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown Recharts Donut */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                Device Experience Split
              </h4>
            </div>
            <span className="text-[11px] font-mono text-muted">Mobile Dominant</span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomChartTooltip unit="%" />} />
                <Pie
                  data={deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-dev-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Blocks Details Table */}
      <div className="p-5 rounded-2xl bg-surface border border-line shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            Detailed Block Conversion Matrix (@{activeProfile.username})
          </h4>
          <span className="text-[11px] text-muted">
            Reconciles with {totalClicks.toLocaleString()} total clicks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted font-mono text-[11px]">
                <th className="pb-2.5 font-medium">Content Block</th>
                <th className="pb-2.5 font-medium">Type</th>
                <th className="pb-2.5 font-medium text-right">Clicks</th>
                <th className="pb-2.5 font-medium text-right">Click Rate</th>
                <th className="pb-2.5 font-medium text-right">Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {blockPerformanceData.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-surface-3/40 transition-colors">
                  <td className="py-2.5 font-medium text-ink max-w-xs truncate">
                    <span title={item.fullTitle}>{item.fullTitle || item.name}</span>
                  </td>
                  <td className="py-2.5 text-muted capitalize">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line-strong text-[10px] font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-ink font-bold tabular-nums">
                    {item.clicks.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono text-success font-semibold tabular-nums">
                    {item.ctr}%
                  </td>
                  <td className="py-2.5 text-right">
                    {item.historicalOnly ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-warning border border-amber-500/30">
                        Historical (Deleted)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Third-Party Tracking Integrations Modal (AN-005) */}
      {isIntegrationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="tracking-integrations-title">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <h3 id="tracking-integrations-title" className="text-sm font-bold text-ink">Tracking & Growth Integrations</h3>
              </div>
              <button
                onClick={() => setIsIntegrationsModalOpen(false)}
                className="text-muted hover:text-ink transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-accent-soft space-y-1">
              <span className="font-semibold text-ink">Privacy & Consent Enforced (AN-005)</span>
              <p className="text-[11px] text-accent-soft/80 leading-relaxed">
                External tracking tags (Pixels) will remain completely disabled until visitors explicitly accept tracking cookies on your public link-in-bio page.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-body mb-1.5">
                  Meta Pixel ID (Facebook / Instagram)
                </label>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-body mb-1.5">
                  Google Analytics Measurement ID
                </label>
                <input
                  type="text"
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-body mb-1.5">
                  TikTok Pixel ID
                </label>
                <input
                  type="text"
                  value={tiktokPixelId}
                  onChange={(e) => setTiktokPixelId(e.target.value)}
                  placeholder="e.g. CXXXXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
              <button
                onClick={() => setIsIntegrationsModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted hover:text-ink bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIntegrations}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Save Integrations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
