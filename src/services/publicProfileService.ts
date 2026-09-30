import { Profile, PublishedProfileSnapshot, AnalyticsEvent } from '../types';
import { createPublishedSnapshot as createSnapshot } from '../utils/publishedSnapshot';
import { analyticsEngineService } from './analyticsEngineService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { INITIAL_PROFILES } from '../data/mockData';
import { reportRecoverableError } from '../utils/reportError';

type PublicProfileStatus = 'success' | 'not_found' | 'unpublished' | 'suspended' | 'deleted';

export interface PublicProfileResolutionResult {
  status: PublicProfileStatus;
  username: string;
  snapshot?: PublishedProfileSnapshot;
  profileId?: string;
  error?: string;
  resolvedAt: string;
}

const STORAGE_KEYS = {
  PROFILES: 'lynkflow_profiles_v1',
  ANALYTICS: 'lynkflow_analytics_v1'
};

/**
 * Creates an authoritative PublishedProfileSnapshot from a profile entity
 */
function createPublishedSnapshot(profile: Profile, publisherEmail: string): PublishedProfileSnapshot {
  return createSnapshot(profile, publisherEmail);
}

class PublicProfileService {
  /**
   * Memory cache for high-performance instant public page resolution
   */
  private snapshotCache: Map<string, { snapshot: PublishedProfileSnapshot; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  /**
   * Resolves a public profile by handle according to PUB-001, PUB-002, and PUB-003.
   * If a valid previewToken is provided, resolves the author's live draft independently from published state without public exposure.
   */
  public async resolvePublicProfile(username: string, previewToken?: string, customDomain?: string, demo = false): Promise<PublicProfileResolutionResult> {
    const cleanUsername = (username || '').trim().toLowerCase().replace(/^@/, '');
    const now = new Date().toISOString();

    const cleanDomain = customDomain?.trim().toLowerCase();
    if (!cleanUsername && !cleanDomain) {
      return {
        status: 'not_found',
        username: cleanUsername,
        error: 'No handle specified',
        resolvedAt: now
      };
    }

    if (demo) {
      const demoProfile = INITIAL_PROFILES.find(profile => profile.username.toLowerCase() === cleanUsername);
      if (demoProfile) {
        const snapshot = createPublishedSnapshot({ ...demoProfile, status: 'published', publishedVersion: Math.max(1, demoProfile.publishedVersion || 1) }, 'LynkFlow demo');
        return { status: 'success', username: cleanUsername, snapshot, profileId: demoProfile.id, resolvedAt: now };
      }
    }

    // Check memory cache first (only for regular public visits, not preview tokens)
    if (!previewToken) {
      const cached = this.snapshotCache.get(cleanUsername);
      if (cached && Date.now() < cached.expiresAt) {
        return {
          status: 'success',
          username: cleanUsername,
          snapshot: cached.snapshot,
          profileId: cached.snapshot.profileId,
          resolvedAt: now
        };
      }
    }

    if (isSupabaseConfigured && previewToken) {
      try {
        const response = await fetch(`/api/public/preview?u=${encodeURIComponent(cleanUsername)}&token=${encodeURIComponent(previewToken)}`);
        const body = await response.json() as { data?: { profile?: Profile }; error?: string };
        if (response.ok && body.data?.profile) {
          const snapshot = createPublishedSnapshot(body.data.profile, 'preview-session@lynkflow.me');
          return { status: 'success', username: cleanUsername, snapshot, profileId: snapshot.profileId, resolvedAt: now };
        }
      } catch {
        // Fall through to the explicit not-found result below; never expose a draft on fetch failure.
      }
      return {
        status: 'not_found',
        username: cleanUsername,
        error: 'Preview link is invalid, expired, or unavailable.',
        resolvedAt: now
      };
    }

    if (isSupabaseConfigured && supabase && !previewToken) {
      const query = supabase.from('published_profiles').select('profile_id,username,snapshot');
      const { data, error } = cleanDomain
        ? await query.filter('snapshot->customDomain->>domain', 'eq', cleanDomain).maybeSingle()
        : await query.eq('username', cleanUsername).maybeSingle();
      if (error) {
        return { status: 'not_found', username: cleanUsername, error: 'Public profile is temporarily unavailable.', resolvedAt: now };
      }
      if (!data) {
        return { status: 'not_found', username: cleanUsername || cleanDomain || '', error: cleanDomain ? 'This custom domain is not connected to an active published profile.' : `The handle @${cleanUsername} does not exist or is not published.`, resolvedAt: now };
      }
      const snapshot = data.snapshot as PublishedProfileSnapshot;
      this.snapshotCache.set(cleanUsername, { snapshot, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return { status: 'success', username: cleanUsername, snapshot, profileId: data.profile_id, resolvedAt: now };
    }

    // Offline/demo fallback only. Production public reads use published_profiles above.
    let storedProfiles: Profile[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (raw) {
        storedProfiles = JSON.parse(raw);
      }
    } catch {
      storedProfiles = [];
    }

    const matchedProfile = storedProfiles.find(
      p => p.username.toLowerCase() === cleanUsername
    );

    if (!matchedProfile) {
      return {
        status: 'not_found',
        username: cleanUsername,
        error: `The handle @${cleanUsername} does not exist or has been removed.`,
        resolvedAt: now
      };
    }

    // If previewToken is provided, verify it and synthesize draft snapshot for previewers
    if (previewToken) {
      let isTokenValid = false;
      try {
        const rawTokens = localStorage.getItem('lynkflow_preview_tokens_v1');
        if (rawTokens) {
          const tokens = JSON.parse(rawTokens) as Array<{ token?: string; profileId?: string; expiresAt?: string }>;
          const match = tokens.find(t => t.token === previewToken && t.profileId === matchedProfile.id);
          if (match?.expiresAt && new Date(match.expiresAt).getTime() > Date.now()) {
            isTokenValid = true;
          }
        }
      } catch (error) {
        reportRecoverableError('preview token lookup failed', error);
      }

      if (!isTokenValid) {
        return {
          status: 'not_found',
          username: cleanUsername,
          profileId: matchedProfile.id,
          error: 'Preview link is invalid or has expired. Please ask the creator for a new preview link.',
          resolvedAt: now
        };
      }

      // Check if there is an active draft in drafts store
      let draftToRender = matchedProfile;
      try {
        const rawDrafts = localStorage.getItem('lynkflow_drafts_v1');
        if (rawDrafts) {
          const drafts = JSON.parse(rawDrafts);
          if (drafts[matchedProfile.id]?.draft) {
            draftToRender = drafts[matchedProfile.id].draft;
          }
        }
      } catch (error) {
        reportRecoverableError('draft preview lookup failed', error);
      }

      const draftSnapshot = createPublishedSnapshot(draftToRender, 'preview-session@lynkflow.me');
      return {
        status: 'success',
        username: cleanUsername,
        snapshot: draftSnapshot,
        profileId: matchedProfile.id,
        resolvedAt: now
      };
    }

    // Check account standing
    if (matchedProfile.status === 'suspended') {
      return {
        status: 'suspended',
        username: cleanUsername,
        profileId: matchedProfile.id,
        error: `This profile (@${cleanUsername}) has been suspended for safety compliance review.`,
        resolvedAt: now
      };
    }

    if (matchedProfile.status === 'deleted') {
      return {
        status: 'deleted',
        username: cleanUsername,
        profileId: matchedProfile.id,
        error: `This profile has been deleted.`,
        resolvedAt: now
      };
    }

    if (matchedProfile.status === 'draft') {
      return {
        status: 'unpublished',
        username: cleanUsername,
        profileId: matchedProfile.id,
        error: `This profile (@${cleanUsername}) is currently unpublished and in private draft status.`,
        resolvedAt: now
      };
    }

    // If published, resolve published snapshot.
    // If not yet saved on profile, synthesize authoritative snapshot from the stored published profile
    const snapshot: PublishedProfileSnapshot = 
      matchedProfile.publishedSnapshot || 
      createPublishedSnapshot(matchedProfile, 'system@lynkflow.me');

    // Cache valid snapshot
    this.snapshotCache.set(cleanUsername, {
      snapshot,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return {
      status: 'success',
      username: cleanUsername,
      snapshot,
      profileId: matchedProfile.id,
      resolvedAt: now
    };
  }

  /**
   * Invalidate cache on publish or update
   */
  public invalidateCache(username?: string) {
    if (username) {
      this.snapshotCache.delete(username.toLowerCase());
    } else {
      this.snapshotCache.clear();
    }
  }

  /**
   * PUB-004 & AN-001: Privacy-Preserving Event Tracking
   * Strips PII, strips query string tracking tokens, hashes visitors daily, and filters bots.
   */
  public sanitizeAndRecordEvent(eventData: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    return analyticsEngineService.recordVisitorEvent(eventData);
  }
}

export const publicProfileService = new PublicProfileService();
