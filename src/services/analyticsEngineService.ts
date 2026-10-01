/**
 * Analytics and Growth Engine Service
 * Feature Specification 08 | Version 1.0
 * Fulfills AN-001, AN-002, AN-003, AN-004, AN-005
 */

import { AnalyticsEvent } from '../types';
import { serializeCsv } from '../utils/csv';
import { reportRecoverableError } from '../utils/reportError';

interface BlockAnalyticsMetric {
  blockId: string;
  blockTitle: string;
  blockType: string;
  clicks: number;
  ctr: number; // percentage (0.0 - 100.0)
  historicalOnly?: boolean; // If block was deleted or reordered
}

interface ReferrerMetric {
  source: string;
  category: 'direct' | 'social' | 'search' | 'campaign' | 'internal';
  views: number;
  percentage: number;
}

interface DeviceMetric {
  device: 'mobile' | 'desktop' | 'tablet';
  views: number;
  percentage: number;
}

interface CountryMetric {
  country: string;
  views: number;
  percentage: number;
  isWithheld?: boolean; // Under threshold for privacy
}

interface TimeSeriesBucket {
  timestamp: number;
  dateLabel: string;
  views: number;
  visitors: number;
  clicks: number;
  qrScans: number;
  ctr: number;
}

export interface AnalyticsAggregateSummary {
  profileId: string;
  dateRange: string;
  timeZone: string;
  totalPageViews: number;
  uniqueVisitors: number;
  totalClicks: number;
  totalQrScans: number;
  overallCtr: number; // percentage
  averageDailyViews: number;
  topPerformingBlock: BlockAnalyticsMetric | null;
  timeSeries: TimeSeriesBucket[];
  blocks: BlockAnalyticsMetric[];
  referrers: ReferrerMetric[];
  devices: DeviceMetric[];
  countries: CountryMetric[];
  consentOptOutRate: number; // percentage of visitors who opted out
  ingestionLagMs: number | null;
}

const STORAGE_KEYS = {
  ANALYTICS: 'lynkflow_analytics_v1',
  EXPORTS: 'lynkflow_analytics_exports_v1',
  AUDIT: 'lynkflow_audit_logs_v1',
  TRACKING_CONSENT: 'lynkflow_tracking_consent_v1'
};

class AnalyticsEngineService {
  /**
   * Generates a privacy-preserving daily visitor hash (AN-001, AN-003)
   * Prevents tracking individuals across days or profiles without persistent cookies.
   */
  public generateDailyVisitorHash(userAgent: string, ipFaux: string, salt: string = 'lf-daily-salt'): string {
    const today = new Date().toISOString().slice(0, 10);
    const raw = `${today}-${userAgent.slice(0, 60)}-${ipFaux}-${salt}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `vh_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Records an ingested visitor action event with bot filtering, sanitization, and consent compliance
   */
  public recordVisitorEvent(eventInput: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    // Detect typical bots and crawlers (AN-001, Edge cases)
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const botPattern = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless/i;
    const isBot = eventInput.isBot !== undefined ? eventInput.isBot : botPattern.test(userAgent);

    // One-way daily visitor hash
    const visitorHash = eventInput.visitorHash || this.generateDailyVisitorHash(userAgent, 'client-ip');

    // Referrer sanitization: strip tracking query strings and hash anchors
    let sanitizedReferrer = 'Direct';
    if (eventInput.referrer) {
      try {
        const url = new URL(eventInput.referrer.startsWith('http') ? eventInput.referrer : `https://${eventInput.referrer}`);
        sanitizedReferrer = url.hostname;
      } catch {
        sanitizedReferrer = eventInput.referrer.split('?')[0].split('#')[0].slice(0, 80);
      }
    }

    const event: AnalyticsEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      profileId: eventInput.profileId,
      type: eventInput.type,
      blockId: eventInput.blockId,
      blockTitle: eventInput.blockTitle,
      tabId: eventInput.tabId,
      snapshotVersion: eventInput.snapshotVersion,
      visitorHash,
      timestamp: Date.now(),
      referrer: sanitizedReferrer || 'Direct',
      country: eventInput.country || 'United States',
      device: eventInput.device || 'mobile',
      campaign: eventInput.campaign ? eventInput.campaign.slice(0, 32) : undefined,
      isBot,
      consentGranted: eventInput.consentGranted !== false
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      const existing: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
      // Keep up to 2000 events in persistent client storage
      const updated = [event, ...existing.slice(0, 1999)];
      localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(updated));
    } catch (error) {
      reportRecoverableError('analytics event persistence failed', error);
    }

    return event;
  }

  /**
   * Authoritative aggregation engine for a profile over a date range with timezone awareness (AN-001, AN-002, AN-003).
   * @param maxHistoryDays - BIL-003 plan retention cap. Events older than this window are excluded.
   *                         Pass the workspace entitlement value (analyticsHistoryDays) to enforce billing limits.
   *                         Defaults to Infinity (no cap) for backward compatibility.
   */
  public aggregateProfileAnalytics(
    profileId: string,
    range: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom',
    timezone: string = 'UTC',
    allKnownBlocks: Array<{ id: string; title: string; type: string }> = [],
    sourceEvents?: AnalyticsEvent[],
    maxHistoryDays: number = Infinity,
    customRange?: { start: number; end: number }
  ): AnalyticsAggregateSummary {
    let rawEvents: AnalyticsEvent[] = sourceEvents ? [...sourceEvents] : [];
    if (!sourceEvents) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
        if (stored) rawEvents = JSON.parse(stored);
      } catch {
        rawEvents = [];
      }
    }

    // 1. Tenant & Profile Isolation (Section 6 & 7)
    // Filter out bots and isolate to target profile
    const profileEvents = rawEvents.filter(
      e => e.profileId === profileId && !e.isBot
    );

    // 2. Date Range Filtering with Timezone
    const now = Date.now();
    const durationMap: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      all: Infinity
    };

    // BIL-003: Enforce plan-level retention cap. The effective cutoff is the MOST RECENT
    // of: the requested range start OR the plan's retention window start.
    // This prevents free users from querying 90-day data even if events exist in storage.
    const requestedCutoff = range === 'custom' && customRange && Number.isFinite(customRange.start)
      ? customRange.start
      : now - (durationMap[range] || durationMap['7d']);
    const planRetentionCutoff = isFinite(maxHistoryDays)
      ? now - maxHistoryDays * 24 * 60 * 60 * 1000
      : 0;
    const cutoff = Math.max(requestedCutoff, planRetentionCutoff);

    const customEnd = range === 'custom' && customRange && Number.isFinite(customRange.end) ? customRange.end : now;
    const inRangeEvents = profileEvents.filter(e => e.timestamp >= cutoff && e.timestamp <= customEnd);

    // 3. Core Totals Computation
    const pageViewEvents = inRangeEvents.filter(e => e.type === 'page_view');
    const clickEvents = inRangeEvents.filter(e => e.type === 'block_click');
    const qrEvents = inRangeEvents.filter(e => e.type === 'qr_scan');

    const totalPageViews = pageViewEvents.length;
    const totalClicks = clickEvents.length;
    const totalQrScans = qrEvents.length;

    // Unique visitors calculated via distinct daily visitor hashes (or fallback to unique IP/device)
    const uniqueVisitorHashes = new Set(
      pageViewEvents.map(e => e.visitorHash || `${e.device}-${e.country}-${new Date(e.timestamp).toISOString().slice(0, 10)}`)
    );
    const uniqueVisitors = uniqueVisitorHashes.size || (totalPageViews > 0 ? 1 : 0);

    const overallCtr = totalPageViews > 0 
      ? Math.round((totalClicks / totalPageViews) * 1000) / 10 
      : 0;

    const daysCount = range === 'custom' && customRange
      ? Math.max(1, Math.ceil((customEnd - cutoff) / (24 * 60 * 60 * 1000)))
      : range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const averageDailyViews = Math.round(totalPageViews / Math.max(1, daysCount));

    // Consent opt-out rate calculation
    const optedOutCount = inRangeEvents.filter(e => e.consentGranted === false).length;
    const consentOptOutRate = inRangeEvents.length > 0
      ? Math.round((optedOutCount / inRangeEvents.length) * 1000) / 10
      : 0;

    // 4. Time Series Bucketing (Reconciles exactly with totals)
    const timeSeries = this.buildReconciledTimeSeries(
      inRangeEvents,
      range,
      timezone,
      range === 'custom' ? { start: cutoff, end: customEnd } : undefined
    );

    // 5. Block Performance & Historical Clicks Preservation (Edge Case 4)
    const blockClickMap: Record<string, { clicks: number; title?: string }> = {};
    clickEvents.forEach(e => {
      const bId = e.blockId || 'unknown_block';
      if (!blockClickMap[bId]) {
        blockClickMap[bId] = { clicks: 0, title: e.blockTitle };
      }
      blockClickMap[bId].clicks++;
      if (e.blockTitle && !blockClickMap[bId].title) {
        blockClickMap[bId].title = e.blockTitle;
      }
    });

    // Merge active blocks with historical blocks
    const blockMetrics: BlockAnalyticsMetric[] = [];
    const seenBlockIds = new Set<string>();

    allKnownBlocks.forEach(b => {
      seenBlockIds.add(b.id);
      const recorded = blockClickMap[b.id]?.clicks || 0;
      const bCtr = totalPageViews > 0 ? Math.round((recorded / totalPageViews) * 1000) / 10 : 0;
      blockMetrics.push({
        blockId: b.id,
        blockTitle: b.title || 'Untitled Block',
        blockType: b.type,
        clicks: recorded,
        ctr: bCtr,
        historicalOnly: false
      });
    });

    // Add historical blocks that received clicks in the past but were deleted or moved
    Object.keys(blockClickMap).forEach(bId => {
      if (!seenBlockIds.has(bId) && bId !== 'unknown_block') {
        const recorded = blockClickMap[bId].clicks;
        const bCtr = totalPageViews > 0 ? Math.round((recorded / totalPageViews) * 1000) / 10 : 0;
        blockMetrics.push({
          blockId: bId,
          blockTitle: blockClickMap[bId].title || `Historical Block (${bId.slice(0, 8)})`,
          blockType: 'link',
          clicks: recorded,
          ctr: bCtr,
          historicalOnly: true
        });
      }
    });

    blockMetrics.sort((a, b) => b.clicks - a.clicks);
    const topPerformingBlock = blockMetrics.length > 0 ? blockMetrics[0] : null;

    // 6. Referrer Analytics & Categorization
    const referrerMap: Record<string, number> = {};
    inRangeEvents.forEach(e => {
      const ref = e.referrer || 'Direct';
      referrerMap[ref] = (referrerMap[ref] || 0) + 1;
    });

    const referrers: ReferrerMetric[] = Object.entries(referrerMap)
      .map(([source, views]) => {
        let category: ReferrerMetric['category'] = 'direct';
        const sLower = source.toLowerCase();
        if (sLower.includes('instagram') || sLower.includes('tiktok') || sLower.includes('twitter') || sLower.includes('x.com') || sLower.includes('youtube') || sLower.includes('linkedin')) {
          category = 'social';
        } else if (sLower.includes('google') || sLower.includes('bing') || sLower.includes('duckduckgo')) {
          category = 'search';
        } else if (sLower.includes('campaign') || sLower.includes('utm')) {
          category = 'campaign';
        } else if (source === 'Direct') {
          category = 'direct';
        } else {
          category = 'internal';
        }

        const percentage = totalPageViews > 0 ? Math.round((views / inRangeEvents.length) * 1000) / 10 : 0;
        return { source, category, views, percentage };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    // 7. Device Breakdown
    const deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    inRangeEvents.forEach(e => {
      const dev = e.device || 'mobile';
      if (dev in deviceMap) {
        deviceMap[dev]++;
      } else {
        deviceMap.mobile++;
      }
    });

    const totalDevEvents = inRangeEvents.length || 1;
    const devices: DeviceMetric[] = [
      { device: 'mobile', views: deviceMap.mobile, percentage: Math.round((deviceMap.mobile / totalDevEvents) * 1000) / 10 },
      { device: 'desktop', views: deviceMap.desktop, percentage: Math.round((deviceMap.desktop / totalDevEvents) * 1000) / 10 },
      { device: 'tablet', views: deviceMap.tablet, percentage: Math.round((deviceMap.tablet / totalDevEvents) * 1000) / 10 },
    ];

    // 8. Privacy-Preserving Country Aggregation (AN-003: Under-threshold values withheld)
    const countryMap: Record<string, number> = {};
    inRangeEvents.forEach(e => {
      const c = e.country || 'Unknown';
      countryMap[c] = (countryMap[c] || 0) + 1;
    });

    const countries: CountryMetric[] = Object.entries(countryMap)
      .map(([country, views]) => {
        const percentage = inRangeEvents.length > 0 ? Math.round((views / inRangeEvents.length) * 1000) / 10 : 0;
        // Privacy rule: if views < 2 and total views > 50, mark as withheld to prevent micro-targeting
        const isWithheld = totalPageViews > 50 && views < 2;
        return {
          country: isWithheld ? 'Other / Withheld' : country,
          views,
          percentage,
          isWithheld
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    const newestEventTimestamp = inRangeEvents.reduce((latest, event) => {
      const timestamp = new Date(event.timestamp).getTime();
      return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
    }, 0);
    const ingestionLagMs = newestEventTimestamp
      ? Math.max(0, Date.now() - newestEventTimestamp)
      : null;

    return {
      profileId,
      dateRange: range,
      timeZone: timezone,
      totalPageViews,
      uniqueVisitors,
      totalClicks,
      totalQrScans,
      overallCtr,
      averageDailyViews,
      topPerformingBlock,
      timeSeries,
      blocks: blockMetrics,
      referrers,
      devices,
      countries,
      consentOptOutRate,
      ingestionLagMs
    };
  }

  /**
   * Helper to build reconciled daily or hourly time-series buckets
   */
  private buildReconciledTimeSeries(
    events: AnalyticsEvent[],
    range: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom',
    timezone: string,
    customRange?: { start: number; end: number }
  ): TimeSeriesBucket[] {
    const buckets: Record<string, { views: number; visitors: Set<string>; clicks: number; qrScans: number; timestamp: number }> = {};
    const now = new Date(customRange?.end || Date.now());
    const days = range === 'custom' && customRange
      ? Math.min(730, Math.max(1, Math.ceil((customRange.end - customRange.start) / (24 * 60 * 60 * 1000))))
      : range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;

    // Initialize all days in the range so the graph has zero-filled days rather than gaps
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone });
      buckets[key] = {
        views: 0,
        visitors: new Set<string>(),
        clicks: 0,
        qrScans: 0,
        timestamp: d.getTime()
      };
    }

    events.forEach(e => {
      const d = new Date(e.timestamp);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone });
      if (!buckets[key]) {
        buckets[key] = {
          views: 0,
          visitors: new Set<string>(),
          clicks: 0,
          qrScans: 0,
          timestamp: e.timestamp
        };
      }
      if (e.type === 'page_view') {
        buckets[key].views++;
        buckets[key].visitors.add(e.visitorHash || `${e.device}-${e.country}`);
      } else if (e.type === 'block_click') {
        buckets[key].clicks++;
      } else if (e.type === 'qr_scan') {
        buckets[key].qrScans++;
      }
    });

    return Object.entries(buckets).map(([dateLabel, data]) => {
      const ctr = data.views > 0 ? Math.round((data.clicks / data.views) * 1000) / 10 : 0;
      return {
        timestamp: data.timestamp,
        dateLabel,
        views: data.views,
        visitors: data.visitors.size,
        clicks: data.clicks,
        qrScans: data.qrScans,
        ctr
      };
    });
  }

  /**
   * Generates a permissioned bounded CSV export of analytics events (AN-004)
   */
  public generateBoundedExportCsv(
    profileId: string,
    username: string,
    range: string,
    operatorEmail: string,
    sourceEvents?: AnalyticsEvent[]
  ): { csvContent: string; exportId: string; rowCount: number } {
    const exportId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let raw: AnalyticsEvent[] = sourceEvents ? [...sourceEvents] : [];
    if (!sourceEvents) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
        if (stored) raw = JSON.parse(stored);
      } catch (error) {
        reportRecoverableError('analytics export audit persistence failed', error);
      }
    }

    // Bounded to 5,000 rows max per AN-004
    const MAX_EXPORT_ROWS = 5000;
    const profileEvents = raw
      .filter(e => e.profileId === profileId && !e.isBot)
      .slice(0, MAX_EXPORT_ROWS);

    const headers = ['Event ID', 'Type', 'Block ID', 'Block Title', 'Referrer', 'Device', 'Country', 'Timestamp (UTC)', 'Consent Granted'];
    const rows = profileEvents.map(e => [
      e.id,
      e.type,
      e.blockId || '',
      e.blockTitle || '',
      e.referrer || 'Direct',
      e.device,
      e.country,
      new Date(e.timestamp).toISOString(),
      e.consentGranted ? 'TRUE' : 'FALSE'
    ]);

    const csvContent = serializeCsv(headers, rows);

    // Record audit log for export access control (AN-004, Section 7)
    try {
      const rawAudits = localStorage.getItem(STORAGE_KEYS.AUDIT);
      const audits = rawAudits ? JSON.parse(rawAudits) : [];
      const newAudit = {
        id: `aud-export-${Date.now()}`,
        actor: operatorEmail,
        action: 'analytics_exported',
        target: `@${username}`,
        timestamp: Date.now(),
        details: `Exported ${profileEvents.length} analytics events (Range: ${range}, Export ID: ${exportId})`
      };
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([newAudit, ...audits.slice(0, 200)]));
    } catch (error) {
      reportRecoverableError('analytics audit persistence failed', error);
    }

    return {
      csvContent,
      exportId,
      rowCount: profileEvents.length
    };
  }

  /**
   * Retrieves or updates user consent status for optional tracking scripts (AN-005)
   */
  public getUserConsent(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRACKING_CONSENT);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (error) {
      reportRecoverableError('analytics consent read failed', error);
    }
    // Default: not consented until user approves
    return false;
  }

  public setUserConsent(consented: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRACKING_CONSENT, consented ? 'true' : 'false');
    } catch (error) {
      reportRecoverableError('analytics consent persistence failed', error);
    }
  }
}

export const analyticsEngineService = new AnalyticsEngineService();
