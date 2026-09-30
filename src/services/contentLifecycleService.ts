/**
 * Lifecycle Service: Draft Save, Preview Token, Validation, Publish, Cache Invalidation, and Rollback
 * Feature Specification 07 | Version 1.0 (Next production lifecycle)
 */

import { 
  Profile, 
  PublishedProfileSnapshot, 
  PreviewToken, 
  ScheduledPublishConfig, 
  AuditLog,
  LinkBlockPayload,
  MediaBlockPayload,
  FolderBlockPayload
} from '../types';
import { PublishedThemeSnapshot } from '../types/themeSchema';
import { normalizeTheme, validateThemeAccessibility, validateThemeSchema, validateProfileAccessibility } from '../utils/themeEngine';
import { publicProfileService } from './publicProfileService';
import { reportRecoverableError } from '../utils/reportError';

export interface ValidationIssue {
  severity: 'critical' | 'warning';
  code: string;
  field: string;
  message: string;
  recommendation?: string;
}

interface PublishValidationResult {
  isValid: boolean;
  canPublish: boolean;
  criticalIssues: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface PublishResult {
  success: boolean;
  snapshot?: PublishedProfileSnapshot;
  publishedVersion?: number;
  etag?: string;
  idempotent?: boolean;
  error?: string;
  criticalIssues?: ValidationIssue[];
  auditLog?: AuditLog;
}

interface DraftSaveResult {
  success: boolean;
  savedDraft?: Profile;
  draftVersion: number;
  etag: string;
  error?: string;
  isConflict?: boolean;
  serverEtag?: string;
  serverVersion?: number;
}

const STORAGE_KEYS = {
  PROFILES: 'lynkflow_profiles_v1',
  DRAFTS: 'lynkflow_drafts_v1',
  PREVIEW_TOKENS: 'lynkflow_preview_tokens_v1',
  SCHEDULED_PUBLISH: 'lynkflow_scheduled_publish_v1',
  IDEMPOTENCY_KEYS: 'lynkflow_publish_idempotency_v1',
  AUDIT_LOGS: 'lynkflow_audit_logs_v1'
};

/**
 * Computes an ETag from profile state string
 */
function generateEtag(profile: Partial<Profile>, draftVersion: number): string {
  const content = `${profile.id}-${draftVersion}-${profile.updatedAt || ''}-${(profile.tabs || []).length}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `W/"etag-${Math.abs(hash).toString(16)}-v${draftVersion}"`;
}

class ContentLifecycleService {
  /**
   * Validate a draft against strict publish blocking rules (PUBL-003)
   */
  public validateDraftForPublish(draft: Profile): PublishValidationResult {
    const criticalIssues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // 1. Identity & Handle
    if (!draft.username || !draft.username.trim()) {
      criticalIssues.push({
        severity: 'critical',
        code: 'HANDLE_REQUIRED',
        field: 'username',
        message: 'Profile username handle is required.',
        recommendation: 'Provide a valid alphanumeric handle.'
      });
    }

    if (!draft.displayName || !draft.displayName.trim()) {
      warnings.push({
        severity: 'warning',
        code: 'DISPLAY_NAME_EMPTY',
        field: 'displayName',
        message: 'Display name is empty; handle will be displayed to visitors.',
        recommendation: 'Add a creator or brand display name.'
      });
    }

    // 2. Tabs & Blocks validation (No broken blocks)
    const tabs = draft.tabs || [];
    if (tabs.length === 0) {
      criticalIssues.push({
        severity: 'critical',
        code: 'NO_TABS',
        field: 'tabs',
        message: 'Profile must contain at least one tab.',
        recommendation: 'Add a default tab with your main links.'
      });
    }

    let totalBlocks = 0;
    let visibleBlocks = 0;

    tabs.forEach((tab, tabIdx) => {
      if (!tab.title || !tab.title.trim()) {
        criticalIssues.push({
          severity: 'critical',
          code: 'TAB_TITLE_EMPTY',
          field: `tabs[${tabIdx}].title`,
          message: `Tab #${tabIdx + 1} has an empty title.`,
          recommendation: 'Name your tab (e.g. "Links", "Portfolio").'
        });
      }

      const blocks = tab.blocks || [];
      totalBlocks += blocks.length;

      blocks.forEach((block, bIdx) => {
        if (!block.isHidden) visibleBlocks++;

        // Link block URL validation
        if (block.type === 'link') {
          const payload = block.payload as LinkBlockPayload;
          if (!payload?.url || !payload.url.trim()) {
            criticalIssues.push({
              severity: 'critical',
              code: 'BROKEN_LINK_URL',
              field: `tabs[${tabIdx}].blocks[${bIdx}].url`,
              message: `Link block "${block.title || 'Untitled'}" is missing a destination URL.`,
              recommendation: 'Provide a valid destination URL (e.g., https://...)'
            });
          }
        }

        // Media block URL validation
        if (block.type === 'media') {
          const payload = block.payload as MediaBlockPayload;
          if (!payload?.url || !payload.url.trim()) {
            criticalIssues.push({
              severity: 'critical',
              code: 'BROKEN_MEDIA_URL',
              field: `tabs[${tabIdx}].blocks[${bIdx}].url`,
              message: `Media block "${block.title || 'Untitled'}" is missing a source URL.`,
              recommendation: 'Specify an image or video URL.'
            });
          }
        }

        // Folder block items validation
        if (block.type === 'folder') {
          const payload = block.payload as FolderBlockPayload;
          if (payload?.items && payload.items.length > 0) {
            payload.items.forEach((item, itemIdx) => {
              if (!item.url || !item.url.trim()) {
                warnings.push({
                  severity: 'warning',
                  code: 'FOLDER_ITEM_URL_MISSING',
                  field: `tabs[${tabIdx}].blocks[${bIdx}].items[${itemIdx}]`,
                  message: `Folder item "${item.title || 'Item'}" has an empty link.`,
                  recommendation: 'Provide a URL or delete unused folder links.'
                });
              }
            });
          }
        }
      });
    });

    if (totalBlocks > 0 && visibleBlocks === 0) {
      warnings.push({
        severity: 'warning',
        code: 'ALL_BLOCKS_HIDDEN',
        field: 'blocks',
        message: 'All blocks in your profile are set to hidden.',
        recommendation: 'Unhide at least one block so visitors see content.'
      });
    }

    // 3. Theme Accessibility Contrast Validation
    try {
      const rawTheme = draft.standardTheme || normalizeTheme(draft.theme);
      const schemaResult = validateThemeSchema(rawTheme);
      schemaResult.errors.forEach(err => {
        criticalIssues.push({
          severity: 'critical',
          code: 'THEME_SCHEMA_INVALID',
          field: `theme.${err.tokenKey}`,
          message: err.message,
          recommendation: 'Remove the invalid value or import a supported theme JSON file.'
        });
      });
      const themeToValidate = normalizeTheme(rawTheme);
      const a11yResult = validateThemeAccessibility(themeToValidate);
      if (!a11yResult.canPublish) {
        a11yResult.errors.forEach(err => {
          criticalIssues.push({
            severity: 'critical',
            code: 'THEME_CONTRAST_FAILURE',
            field: `theme.${err.tokenKey}`,
            message: `Accessibility failure: ${err.message}`,
            recommendation: err.suggestedFix || 'Adjust background or text color for WCAG AA compliance.'
          });
        });
      }
      a11yResult.warnings.forEach(warn => {
        warnings.push({
          severity: 'warning',
          code: 'THEME_CONTRAST_WARNING',
          field: `theme.${warn.tokenKey}`,
          message: warn.message,
          recommendation: warn.suggestedFix
        });
      });
      const contentA11y = validateProfileAccessibility(draft, themeToValidate);
      contentA11y.errors.forEach(issue => {
        criticalIssues.push({
          severity: 'critical',
          code: 'CONTENT_ACCESSIBILITY_FAILURE',
          field: issue.tokenKey,
          message: issue.message,
          recommendation: 'Fix the accessibility issue before publishing.'
        });
      });
      contentA11y.warnings.forEach(issue => {
        warnings.push({
          severity: 'warning',
          code: 'CONTENT_ACCESSIBILITY_WARNING',
          field: issue.tokenKey,
          message: issue.message,
          recommendation: 'Review this content or theme setting for a more accessible result.'
        });
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid theme format';
      criticalIssues.push({
        severity: 'critical',
        code: 'THEME_CORRUPT',
        field: 'theme',
        message: `Theme structure could not be parsed: ${message}`
      });
    }

    return {
      isValid: criticalIssues.length === 0,
      canPublish: criticalIssues.length === 0,
      criticalIssues,
      warnings
    };
  }

  /**
   * Persists draft independently using optimistic concurrency with version & ETag (PUBL-001, PUBL-002)
   */
  public async saveDraftWithConcurrency(
    profileId: string,
    draftData: Profile,
    clientExpectedEtag?: string,
    simulateLatencyMs = 180
  ): Promise<DraftSaveResult> {
    if (simulateLatencyMs > 0) {
      await new Promise(r => setTimeout(r, simulateLatencyMs));
    }

    try {
      const rawTheme = draftData.standardTheme || normalizeTheme(draftData.theme);
      const schemaResult = validateThemeSchema(rawTheme);
      if (!schemaResult.isValid) {
        const details = schemaResult.errors.map(issue => `${issue.tokenKey}: ${issue.message}`).join('; ');
        return {
          success: false,
          draftVersion: draftData.draftVersion || 0,
          etag: draftData.etag || '',
          error: `Theme validation failed. Draft was not saved. ${details}`
        };
      }
      const rawDrafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      const drafts: Record<string, { draft: Profile; etag: string; draftVersion: number; updatedAt: string }> = 
        rawDrafts ? JSON.parse(rawDrafts) : {};

      const existingRecord = drafts[profileId];
      const currentDraftVersion = (existingRecord?.draftVersion || draftData.draftVersion || 0);

      // Optimistic concurrency check via ETag:
      // If client supplied an ETag and it does not match existing server record, return 409 conflict
      if (clientExpectedEtag && existingRecord && existingRecord.etag !== clientExpectedEtag) {
        return {
          success: false,
          draftVersion: existingRecord.draftVersion,
          etag: existingRecord.etag,
          isConflict: true,
          serverEtag: existingRecord.etag,
          serverVersion: existingRecord.draftVersion,
          error: 'Concurrency conflict: Draft was modified in another session. Please reload remote changes.'
        };
      }

      const nextDraftVersion = currentDraftVersion + 1;
      const now = new Date().toISOString();
      const updatedDraft: Profile = {
        ...draftData,
        draftVersion: nextDraftVersion,
        updatedAt: now
      };

      const newEtag = generateEtag(updatedDraft, nextDraftVersion);
      updatedDraft.etag = newEtag;

      drafts[profileId] = {
        draft: updatedDraft,
        etag: newEtag,
        draftVersion: nextDraftVersion,
        updatedAt: now
      };

      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));

      return {
        success: true,
        savedDraft: updatedDraft,
        draftVersion: nextDraftVersion,
        etag: newEtag
      };
    } catch (error: unknown) {
      return {
        success: false,
        draftVersion: 0,
        etag: '',
        error: error instanceof Error ? error.message : 'Failed to persist draft to server storage.'
      };
    }
  }

  /**
   * Retrieves server draft and its authoritative ETag
   */
  public getStoredDraft(profileId: string): { draft?: Profile; etag?: string; draftVersion?: number } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (raw) {
        const drafts = JSON.parse(raw);
        if (drafts[profileId]) {
          return drafts[profileId];
        }
      }
    } catch (error) {
      reportRecoverableError('draft persistence read failed', error);
    }
    return {};
  }

  /**
   * Generates or validates an expiring shareable Preview Token (PUBL-001)
   */
  public createPreviewToken(profileId: string, creatorEmail: string, ttlMinutes = 60): PreviewToken {
    const token = `prev_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const previewToken: PreviewToken = {
      token,
      profileId,
      createdAt,
      expiresAt,
      createdBy: creatorEmail
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREVIEW_TOKENS);
      const tokens: PreviewToken[] = raw ? JSON.parse(raw) : [];
      // Keep unexpired tokens
      const active = tokens.filter(t => new Date(t.expiresAt).getTime() > Date.now());
      active.push(previewToken);
      localStorage.setItem(STORAGE_KEYS.PREVIEW_TOKENS, JSON.stringify(active));
    } catch (error) {
      reportRecoverableError('preview token persistence failed', error);
    }

    return previewToken;
  }

  /**
   * Verifies if a preview token is valid
   */
  public verifyPreviewToken(tokenString: string, profileId: string): { valid: boolean; error?: string } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREVIEW_TOKENS);
      if (!raw) return { valid: false, error: 'No preview tokens exist.' };
      const tokens: PreviewToken[] = JSON.parse(raw);
      const matched = tokens.find(t => t.token === tokenString && t.profileId === profileId);

      if (!matched) {
        return { valid: false, error: 'Invalid preview token.' };
      }

      if (new Date(matched.expiresAt).getTime() <= Date.now()) {
        return { valid: false, error: 'Preview link has expired. Request a fresh preview link.' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Unable to verify preview token.' };
    }
  }

  /**
   * Atomically publishes a snapshot with idempotency support and cache invalidation (PUBL-003, PUBL-004)
   */
  public async publishAuthoritative(
    draftProfile: Profile,
    publisherEmail: string,
    idempotencyKey?: string,
    changeNote?: string,
    versionName?: string,
    versionNotes?: string
  ): Promise<PublishResult> {
    // 1. Idempotency Check: if key has already been executed, return cached authoritative result
    if (idempotencyKey) {
      try {
        const rawIdemp = localStorage.getItem(STORAGE_KEYS.IDEMPOTENCY_KEYS);
        if (rawIdemp) {
          const map = JSON.parse(rawIdemp);
          if (map[idempotencyKey]) {
            return {
              ...map[idempotencyKey],
              idempotent: true
            };
          }
        }
      } catch (error) {
        reportRecoverableError('publish idempotency read failed', error);
      }
    }

    // 2. Strict validation check (PUBL-003)
    const validation = this.validateDraftForPublish(draftProfile);
    if (!validation.canPublish) {
      return {
        success: false,
        error: `Cannot publish: ${validation.criticalIssues[0]?.message || 'Validation failed'}`,
        criticalIssues: validation.criticalIssues
      };
    }

    // 3. Create immutable snapshot
    const now = new Date().toISOString();
    const storedProfilesRaw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const storedProfiles: Profile[] = storedProfilesRaw ? JSON.parse(storedProfilesRaw) : [];
    const existing = storedProfiles.find(p => p.id === draftProfile.id);

    const nextPublishedVersion = ((existing?.publishedVersion || draftProfile.publishedVersion || 0) + 1);
    const currentTheme = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);

    const snapshot: PublishedProfileSnapshot = {
      snapshotId: `snap-${draftProfile.id}-v${nextPublishedVersion}-${Date.now()}`,
      version: nextPublishedVersion,
      profileId: draftProfile.id,
      username: draftProfile.username.toLowerCase(),
      displayName: draftProfile.displayName || `@${draftProfile.username}`,
      bio: draftProfile.bio || '',
      avatarUrl: draftProfile.avatarUrl || '',
      category: draftProfile.category || 'Creator',
      verified: !!draftProfile.verified,
      socialPosition: draftProfile.socialPosition || 'top',
      socialLinks: (draftProfile.socialLinks || []).filter(s => s.active && s.url),
      theme: draftProfile.theme,
      standardTheme: currentTheme,
      tabs: JSON.parse(JSON.stringify(draftProfile.tabs || [])),
      customDomain: draftProfile.customDomain,
      qrConfig: draftProfile.qrConfig,
      seo: {
        title: draftProfile.seo?.title || `${draftProfile.displayName || draftProfile.username} | LynkFlow`,
        description: draftProfile.seo?.description || draftProfile.bio || 'Link in Bio and Mini-Site',
        noIndex: !!draftProfile.seo?.noIndex,
        ogImage: draftProfile.seo?.ogImage || draftProfile.avatarUrl
      },
      publishedAt: now,
      publishedBy: publisherEmail
    };
    const themeSnapshot: PublishedThemeSnapshot = {
      snapshotId: snapshot.snapshotId,
      version: nextPublishedVersion,
      profileId: draftProfile.id,
      schemaVersion: currentTheme.schemaVersion,
      rendererVersion: 'profile-renderer-v1',
      theme: currentTheme,
      timestamp: now,
      publishedBy: publisherEmail,
      versionName: versionName || `Release v${nextPublishedVersion}`,
      versionNotes: versionNotes || changeNote,
      changeNote
    };

    // Atomic update of profiles store
    const existingHistory = existing?.snapshotHistory || draftProfile.snapshotHistory || [];
    const updatedHistory = [snapshot, ...existingHistory.slice(0, 49)]; // Retain up to 50 immutable snapshots

    const updatedProfile: Profile = {
      ...draftProfile,
      standardTheme: currentTheme,
      status: 'published',
      publishedVersion: nextPublishedVersion,
      publishedSnapshot: snapshot,
      themeSnapshots: [themeSnapshot, ...(draftProfile.themeSnapshots || []).slice(0, 49)],
      snapshotHistory: updatedHistory,
      publishedAt: now,
      updatedAt: now
    };

    // Write to persistent storage
    const newProfilesList = storedProfiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    if (!newProfilesList.some(p => p.id === updatedProfile.id)) {
      newProfilesList.push(updatedProfile);
    }
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(newProfilesList));

    // Atomically Invalidate Cache (PUBL-004)
    publicProfileService.invalidateCache(updatedProfile.username);

    // Record Audit Log (PUBL-005, Section 7)
    const auditLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor: publisherEmail,
      action: 'profile_published',
      target: `@${updatedProfile.username}`,
      timestamp: Date.now(),
      details: changeNote || `Published immutable snapshot v${nextPublishedVersion} with ${snapshot.tabs.reduce((acc, t) => acc + (t.blocks?.length || 0), 0)} blocks.`
    };

    try {
      const rawAudits = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const audits: AuditLog[] = rawAudits ? JSON.parse(rawAudits) : [];
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([auditLog, ...audits.slice(0, 200)]));
    } catch (error) {
      reportRecoverableError('publish audit persistence failed', error);
    }

    const result: PublishResult = {
      success: true,
      snapshot,
      publishedVersion: nextPublishedVersion,
      etag: generateEtag(updatedProfile, nextPublishedVersion),
      auditLog
    };

    // Store idempotency result if key provided
    if (idempotencyKey) {
      try {
        const rawIdemp = localStorage.getItem(STORAGE_KEYS.IDEMPOTENCY_KEYS);
        const map = rawIdemp ? JSON.parse(rawIdemp) : {};
        map[idempotencyKey] = result;
        localStorage.setItem(STORAGE_KEYS.IDEMPOTENCY_KEYS, JSON.stringify(map));
      } catch (error) {
        reportRecoverableError('publish idempotency persistence failed', error);
      }
    }

    return result;
  }

  /**
   * Rollback to an immutable snapshot with permission check & audit logging (PUBL-005)
   */
  public async rollbackToSnapshot(
    profileId: string,
    snapshotId: string,
    operatorEmail: string,
    isAuthorizedOwner: boolean,
    reason?: string
  ): Promise<{ success: boolean; rolledBackProfile?: Profile; error?: string; auditLog?: AuditLog }> {
    if (!isAuthorizedOwner) {
      // Permission failure audit
      const deniedAudit: AuditLog = {
        id: `aud-denied-${Date.now()}`,
        actor: operatorEmail,
        action: 'rollback_permission_denied',
        target: `profile-${profileId}`,
        timestamp: Date.now(),
        details: `Unauthorized attempt to rollback profile to snapshot ${snapshotId}`
      };
      try {
        const rawAudits = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
        const audits: AuditLog[] = rawAudits ? JSON.parse(rawAudits) : [];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([deniedAudit, ...audits.slice(0, 200)]));
      } catch (error) {
        reportRecoverableError('rollback denial audit persistence failed', error);
      }

      return {
        success: false,
        error: 'Permission denied: Only the verified profile owner or workspace admin can perform rollback.'
      };
    }

    const storedProfilesRaw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const storedProfiles: Profile[] = storedProfilesRaw ? JSON.parse(storedProfilesRaw) : [];
    const profile = storedProfiles.find(p => p.id === profileId);

    if (!profile) {
      return { success: false, error: 'Target profile not found.' };
    }

    const targetSnapshot = (profile.snapshotHistory || []).find(s => s.snapshotId === snapshotId);
    if (!targetSnapshot) {
      return { success: false, error: `Snapshot ${snapshotId} does not exist in version history.` };
    }

    const now = new Date().toISOString();
    const newVersion = (profile.publishedVersion || 0) + 1;

    // Build rolled back snapshot
    const rolledBackSnapshot: PublishedProfileSnapshot = {
      ...targetSnapshot,
      snapshotId: `snap-${profile.id}-v${newVersion}-rollback-${Date.now()}`,
      version: newVersion,
      publishedAt: now,
      publishedBy: operatorEmail
    };

    const rolledBackProfile: Profile = {
      ...profile,
      username: targetSnapshot.username,
      displayName: targetSnapshot.displayName,
      bio: targetSnapshot.bio,
      avatarUrl: targetSnapshot.avatarUrl,
      category: targetSnapshot.category,
      verified: targetSnapshot.verified,
      socialPosition: targetSnapshot.socialPosition,
      socialLinks: JSON.parse(JSON.stringify(targetSnapshot.socialLinks || [])),
      theme: targetSnapshot.theme,
      standardTheme: targetSnapshot.standardTheme,
      tabs: JSON.parse(JSON.stringify(targetSnapshot.tabs || [])),
      customDomain: targetSnapshot.customDomain,
      qrConfig: targetSnapshot.qrConfig,
      seo: targetSnapshot.seo,
      publishedVersion: newVersion,
      publishedSnapshot: rolledBackSnapshot,
      snapshotHistory: [rolledBackSnapshot, ...(profile.snapshotHistory || [])],
      publishedAt: now,
      updatedAt: now
    };

    // Save
    const updatedList = storedProfiles.map(p => p.id === profile.id ? rolledBackProfile : p);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(updatedList));

    // Invalidate public resolution cache
    publicProfileService.invalidateCache(rolledBackProfile.username);

    // Audit log
    const auditLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor: operatorEmail,
      action: 'profile_rollback',
      target: `@${rolledBackProfile.username}`,
      timestamp: Date.now(),
      details: reason || `Rolled back to snapshot ${targetSnapshot.snapshotId} (original version v${targetSnapshot.version}). New release v${newVersion}.`
    };

    try {
      const rawAudits = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const audits: AuditLog[] = rawAudits ? JSON.parse(rawAudits) : [];
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([auditLog, ...audits.slice(0, 200)]));
    } catch (error) {
      reportRecoverableError('rollback audit persistence failed', error);
    }

    return {
      success: true,
      rolledBackProfile,
      auditLog
    };
  }

  /**
   * Schedule a future publish with UTC normalization and timezone awareness
   */
  public schedulePublish(
    profile: Profile,
    scheduledIsoString: string,
    timezone: string,
    schedulerEmail: string
  ): ScheduledPublishConfig {
    // Validate target draft first
    const validation = this.validateDraftForPublish(profile);
    if (!validation.canPublish) {
      throw new Error(`Cannot schedule publish: ${validation.criticalIssues[0]?.message}`);
    }

    const scheduledDate = new Date(scheduledIsoString);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled publish date format.');
    }

    if (scheduledDate.getTime() <= Date.now() + 60 * 1000) {
      throw new Error('Scheduled time must be at least 1 minute in the future.');
    }

    const scheduledConfig: ScheduledPublishConfig = {
      id: `sched-${profile.id}-${Date.now()}`,
      profileId: profile.id,
      scheduledTimeUtc: scheduledDate.toISOString(),
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      createdAt: new Date().toISOString(),
      createdBy: schedulerEmail,
      status: 'pending',
      targetSnapshotDraft: JSON.parse(JSON.stringify(profile))
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_PUBLISH);
      const list: ScheduledPublishConfig[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter(item => item.profileId !== profile.id);
      updated.push(scheduledConfig);
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_PUBLISH, JSON.stringify(updated));
    } catch (error) {
      reportRecoverableError('scheduled publish persistence failed', error);
    }

    return scheduledConfig;
  }

  /**
   * Cancel a pending scheduled publish
   */
  public cancelScheduledPublish(profileId: string, operatorEmail: string): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_PUBLISH);
      if (!raw) return true;
      const list: ScheduledPublishConfig[] = JSON.parse(raw);
      const target = list.find(s => s.profileId === profileId);
      if (target) {
        target.status = 'cancelled';
        localStorage.setItem(STORAGE_KEYS.SCHEDULED_PUBLISH, JSON.stringify(list));

        // Audit log
        const auditLog: AuditLog = {
          id: `aud-${Date.now()}`,
          actor: operatorEmail,
          action: 'scheduled_publish_cancelled',
          target: `profile-${profileId}`,
          timestamp: Date.now(),
          details: `Cancelled scheduled release ${target.id} previously scheduled for ${target.scheduledTimeUtc}`
        };
        const rawAudits = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
        const audits: AuditLog[] = rawAudits ? JSON.parse(rawAudits) : [];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([auditLog, ...audits.slice(0, 200)]));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks pending scheduled publishes and executes them if their UTC time has arrived
   */
  public async executeDueScheduledPublishes(): Promise<Array<{ profileId: string; success: boolean; error?: string }>> {
    const results: Array<{ profileId: string; success: boolean; error?: string }> = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULED_PUBLISH);
      if (!raw) return results;
      const list: ScheduledPublishConfig[] = JSON.parse(raw);
      const now = Date.now();

      for (const item of list) {
        if (item.status === 'pending') {
          const dueTime = new Date(item.scheduledTimeUtc).getTime();
          if (now >= dueTime) {
            // Execute publish
            const pubResult = await this.publishAuthoritative(
              item.targetSnapshotDraft,
              item.createdBy,
              `idemp-sched-${item.id}`,
              `Automatically executed scheduled release (${item.id}) at ${new Date().toISOString()} (Target was ${item.scheduledTimeUtc} in ${item.timezone})`
            );

            if (pubResult.success) {
              item.status = 'executed';
              results.push({ profileId: item.profileId, success: true });
            } else {
              item.status = 'failed';
              item.failureReason = pubResult.error;
              results.push({ profileId: item.profileId, success: false, error: pubResult.error });
            }
          }
        }
      }

      localStorage.setItem(STORAGE_KEYS.SCHEDULED_PUBLISH, JSON.stringify(list));
    } catch (error: unknown) {
      console.error('Error executing scheduled publishes:', error);
    }
    return results;
  }
}

export const contentLifecycleService = new ContentLifecycleService();
